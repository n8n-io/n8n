import { Container } from '@n8n/di';
import type { OutboundHttp } from '@n8n/backend-network';
import type { IExecutionResponse } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import { buildHitlCallbackReference } from 'n8n-core';
import type { ActionEvent, Adapter } from 'chat';
import { mock } from 'vitest-mock-extended';
import type { INode, IRunExecutionData, IExecuteData } from 'n8n-workflow';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import { WaitTracker } from '@/wait-tracker';
import { AgentChannelHitlService } from '../agent-channel-hitl.service';
import {
	ChatIntegrationRegistry,
	type AgentChatIntegration,
} from '../../integrations/agent-chat-integration';
import type { AgentRepository } from '../../repositories/agent.repository';
import type { AgentCredentialLookupService } from '../../integrations/agent-credential-lookup.service';
import type { AgentBackgroundJobRepository } from '../../repositories/agent-background-job.repository';
import type { AgentBackgroundJob } from '../../entities/agent-background-job.entity';
import { slackHitl } from '../../integrations/platforms/slack/slack-hitl';
import { telegramHitl } from '../../integrations/platforms/telegram/telegram-hitl';
import { discordHitl } from '../../integrations/platforms/discord/discord-hitl';

const secret = 'test-channel-response-secret';
function setup() {
	const executions = mock<ExecutionPersistence>();
	const jobs = mock<AgentBackgroundJobRepository>();
	const tracker = mock<WaitTracker>();
	Container.set(WaitTracker, tracker);
	const registry = new ChatIntegrationRegistry();
	for (const [type, hitl, credentialType] of [
		['slack', slackHitl, 'slackApi'],
		['telegram', telegramHitl, 'telegramApi'],
		['discord', discordHitl, 'discordBotApi'],
	] as const)
		registry.register(
			mock<AgentChatIntegration>({ type, hitl, credentialTypes: [credentialType] }),
		);
	const service = new AgentChannelHitlService(
		mock<AgentRepository>(),
		registry,
		mock<AgentCredentialLookupService>(),
		mock<OutboundHttp>(),
		executions,
		jobs,
		mock<InstanceSettings>({ hmacSignatureSecret: secret }),
	);
	const node = mock<INode>({
		id: 'approval-node',
		name: 'Request approval',
		type: 'n8n-nodes-base.slack',
		parameters: {
			agentApproval: true,
			select: 'user',
			user: { __rl: true, mode: 'id', value: 'U1' },
		},
		credentials: { slackApi: { id: 'credential', name: 'Slack' } },
	});
	const execution = mock<IExecutionResponse>({
		id: '123',
		status: 'waiting',
		data: mock<IRunExecutionData>({
			parentAgentRun: {
				agentId: 'agent',
				projectId: 'project',
				runId: 'run',
				toolCallId: 'tool',
				threadId: 'original-thread',
			},
			executionData: mock({ nodeExecutionStack: [mock<IExecuteData>({ node })] }),
		}),
	});
	executions.findSingleExecution.mockResolvedValue(execution);
	const job = mock<AgentBackgroundJob>({
		kind: 'approval',
		parentAgentId: 'agent',
		status: 'running',
		timeoutAt: null,
		settledAt: null,
	});
	jobs.findWorkflowJobByExecutionId.mockResolvedValue(job);
	const adapter = mock<Adapter>();
	adapter.decodeThreadId.mockReturnValue({ channel: 'C1' });
	const event = mock<ActionEvent>({
		actionId: buildHitlCallbackReference('123', 'a', secret),
		adapter,
		user: mock({ userId: 'U1' }),
	});
	const respond = async () =>
		await service.respond('agent', 'project', { type: 'slack', credentialId: 'credential' }, event);
	return { service, executions, jobs, tracker, node, execution, job, event, respond };
}
afterEach(() => Container.reset());

it.each([true, false])('resumes the durable child workflow with approved=%s', async (approved) => {
	const { event, tracker, respond } = setup();
	event.actionId = buildHitlCallbackReference('123', approved ? 'a' : 'd', secret);
	expect(await respond()).toBe(approved);
	expect(tracker.startExecution).toHaveBeenCalledWith('123', {
		nodeId: 'approval-node',
		data: [
			{
				json: {
					data: {
						approved,
						respondedAt: expect.any(String),
						responder: { id: 'U1', source: 'slack' },
					},
				},
			},
		],
	});
});

it.each(['slack', 'telegram', 'discord'] as const)(
	'accepts native %s destination responses',
	async (type) => {
		const { service, node, event, tracker } = setup();
		node.type = `n8n-nodes-base.${type}`;
		node.credentials = {
			[type === 'slack' ? 'slackApi' : type === 'telegram' ? 'telegramApi' : 'discordBotApi']: {
				id: 'credential',
				name: type,
			},
		};
		node.parameters = {
			agentApproval: true,
			...(type === 'telegram'
				? { chatId: 'U1' }
				: type === 'discord'
					? { sendTo: 'user', userId: { __rl: true, mode: 'id', value: 'U1' } }
					: { select: 'channel', channelId: { __rl: true, mode: 'id', value: 'C1' } }),
		};
		expect(
			await service.respond('agent', 'project', { type, credentialId: 'credential' }, event),
		).toBe(true);
		expect(tracker.startExecution).toHaveBeenCalledOnce();
	},
);

it.each([
	'malformed',
	'signature',
	'agent',
	'project',
	'credential',
	'node',
	'state',
	'job',
	'expired',
	'user',
	'channel',
] as const)('does not resume an unavailable %s response', async (reason) => {
	const { event, execution, node, job, jobs, tracker, respond } = setup();
	if (reason === 'malformed') event.actionId = 'invalid';
	if (reason === 'signature')
		event.actionId = buildHitlCallbackReference('123', 'd', 'another-secret');
	if (reason === 'agent') execution.data.parentAgentRun!.agentId = 'other';
	if (reason === 'project') execution.data.parentAgentRun!.projectId = 'other';
	if (reason === 'credential') node.credentials!.slackApi.id = 'other';
	if (reason === 'node') node.parameters.agentApproval = false;
	if (reason === 'state') execution.status = 'success';
	if (reason === 'job') jobs.findWorkflowJobByExecutionId.mockResolvedValue(null);
	if (reason === 'expired') job.timeoutAt = new Date(Date.now() - 1000);
	if (reason === 'user') event.user.userId = 'other';
	if (reason === 'channel')
		node.parameters = {
			agentApproval: true,
			select: 'channel',
			channelId: { __rl: true, mode: 'id', value: 'another-channel' },
		};
	expect(await respond()).toBe('unavailable');
	expect(tracker.startExecution).not.toHaveBeenCalled();
});

it('treats a concurrent response as already handled', async () => {
	const { tracker, respond } = setup();
	tracker.startExecution.mockRejectedValue(new ExecutionAlreadyResumingError('123'));
	expect(await respond()).toBe('unavailable');
});
