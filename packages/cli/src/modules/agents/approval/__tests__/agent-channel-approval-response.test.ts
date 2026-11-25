import { Container } from '@n8n/di';
import type { OutboundHttp } from '@n8n/backend-network';
import type { IExecutionResponse } from '@n8n/db';
import type { InstanceSettings } from 'n8n-core';
import { buildHitlCallbackReference } from 'n8n-core';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { ActionEvent, Adapter } from 'chat';
import { mock } from 'vitest-mock-extended';
import type { INode, IRunExecutionData, IExecuteData } from 'n8n-workflow';
import type { ExecutionPersistence } from '@/executions/execution-persistence';
import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import { ResponseWaitTracker } from '@/executions/response-wait-tracker.service';
import {
	AgentChannelHitlService,
	APPROVAL_JOB_LOOKUP_DELAYS_MS,
} from '../agent-channel-hitl.service';
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
	const tracker = mock<ResponseWaitTracker>();
	tracker.respond.mockResolvedValue(true);
	Container.set(ResponseWaitTracker, tracker);
	const registry = new ChatIntegrationRegistry();
	// A plain object: `mock()` wraps the shared adapter again in every test.
	for (const [type, hitl, credentialType] of [
		['slack', slackHitl, 'slackApi'],
		['telegram', telegramHitl, 'telegramApi'],
		['discord', discordHitl, 'discordBotApi'],
	] as const)
		registry.register({
			type,
			hitl,
			credentialTypes: [credentialType],
		} as unknown as AgentChatIntegration);
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
		type: 'n8n-nodes-base.agentChannelApproval',
		parameters: {
			channel: 'slack',
			parameters: { select: 'user', user: { __rl: true, mode: 'id', value: 'U1' } },
		},
		credentials: { slackApi: { id: 'credential', name: 'Slack' } },
	});
	const execution = mock<IExecutionResponse>({
		id: '123',
		workflowId: 'workflow',
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
		workflowId: 'workflow',
		parentAgentId: 'agent',
		parentRunId: 'run',
		parentThreadId: 'original-thread',
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
	const integration: { value: AgentIntegrationConfig } = {
		value: { type: 'slack', credentialId: 'credential' },
	};
	const respond = async () => await service.respond('agent', 'project', integration.value, event);
	return { service, executions, jobs, tracker, node, execution, job, event, integration, respond };
}
afterEach(() => Container.reset());

it.each([true, false])('resumes the durable child workflow with approved=%s', async (approved) => {
	const { event, tracker, respond } = setup();
	event.actionId = buildHitlCallbackReference('123', approved ? 'a' : 'd', secret);
	expect(await respond()).toBe(approved);
	expect(tracker.respond).toHaveBeenCalledWith('123', {
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
		node.parameters.channel = type;
		node.credentials = {
			[type === 'slack' ? 'slackApi' : type === 'telegram' ? 'telegramApi' : 'discordBotApi']: {
				id: 'credential',
				name: type,
			},
		};
		node.parameters = {
			channel: type,
			parameters: {
				...(type === 'telegram'
					? { chatId: 'U1' }
					: type === 'discord'
						? { sendTo: 'user', userId: { __rl: true, mode: 'id', value: 'U1' } }
						: { select: 'channel', channelId: { __rl: true, mode: 'id', value: 'C1' } }),
			},
		};
		expect(
			await service.respond('agent', 'project', { type, credentialId: 'credential' }, event),
		).toBe(true);
		expect(tracker.respond).toHaveBeenCalledOnce();
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
	'suspended',
	'missingExecution',
	'missingNode',
	'unsupportedPlatform',
	'nodeType',
	'integrationCredential',
	'jobKind',
	'jobAgent',
	'jobStatus',
	'parentRun',
	'parentThread',
	'workflow',
	'expired',
	'user',
	'channel',
] as const)('does not resume an unavailable %s response', async (reason) => {
	const { event, execution, executions, node, job, integration, tracker, respond } = setup();
	if (reason === 'malformed') event.actionId = 'invalid';
	if (reason === 'signature')
		event.actionId = buildHitlCallbackReference('123', 'd', 'another-secret');
	if (reason === 'agent') execution.data.parentAgentRun!.agentId = 'other';
	if (reason === 'project') execution.data.parentAgentRun!.projectId = 'other';
	if (reason === 'credential') node.credentials!.slackApi.id = 'other';
	if (reason === 'node') node.parameters.parameters = undefined;
	if (reason === 'state') execution.status = 'success';
	if (reason === 'suspended') execution.data.waitReason = 'suspended';
	if (reason === 'missingExecution') executions.findSingleExecution.mockResolvedValue(undefined);
	if (reason === 'missingNode') execution.data.executionData!.nodeExecutionStack = [];
	if (reason === 'unsupportedPlatform')
		integration.value = { type: 'teams', credentialId: 'credential' } as AgentIntegrationConfig;
	if (reason === 'nodeType') node.type = 'n8n-nodes-base.telegram';
	if (reason === 'integrationCredential')
		integration.value = { type: 'slack' } as AgentIntegrationConfig;
	if (reason === 'jobKind') job.kind = 'workflow';
	if (reason === 'jobAgent') job.parentAgentId = 'other';
	if (reason === 'jobStatus') job.status = 'completed';
	if (reason === 'parentRun') job.parentRunId = 'other-run';
	if (reason === 'parentThread') job.parentThreadId = 'other-thread';
	if (reason === 'workflow') job.workflowId = 'other-workflow';
	if (reason === 'expired') job.timeoutAt = new Date(Date.now() - 1000);
	if (reason === 'user') event.user.userId = 'other';
	if (reason === 'channel')
		node.parameters = {
			channel: 'slack',
			parameters: {
				select: 'channel',
				channelId: { __rl: true, mode: 'id', value: 'another-channel' },
			},
		};
	expect(await respond()).toBe('unavailable');
	expect(tracker.respond).not.toHaveBeenCalled();
});

it('reads the job again when the response arrives before the job is saved', async () => {
	vi.useFakeTimers();
	try {
		const { job, jobs, tracker, respond } = setup();
		jobs.findWorkflowJobByExecutionId.mockReset();
		jobs.findWorkflowJobByExecutionId.mockResolvedValueOnce(null).mockResolvedValueOnce(job);
		const result = respond();
		await vi.advanceTimersByTimeAsync(APPROVAL_JOB_LOOKUP_DELAYS_MS[0]);
		expect(await result).toBe(true);
		expect(jobs.findWorkflowJobByExecutionId).toHaveBeenCalledTimes(2);
		expect(tracker.respond).toHaveBeenCalledOnce();
	} finally {
		vi.useRealTimers();
	}
});

it('does not resume when the job stays missing', async () => {
	vi.useFakeTimers();
	try {
		const { jobs, tracker, respond } = setup();
		jobs.findWorkflowJobByExecutionId.mockResolvedValue(null);
		const result = respond();
		await vi.advanceTimersByTimeAsync(
			APPROVAL_JOB_LOOKUP_DELAYS_MS.reduce((total, delay) => total + delay, 0),
		);
		expect(await result).toBe('unavailable');
		expect(jobs.findWorkflowJobByExecutionId).toHaveBeenCalledTimes(
			APPROVAL_JOB_LOOKUP_DELAYS_MS.length + 1,
		);
		expect(tracker.respond).not.toHaveBeenCalled();
	} finally {
		vi.useRealTimers();
	}
});

it('reports the response as unavailable when the resume is refused', async () => {
	const { tracker, respond } = setup();
	tracker.respond.mockResolvedValue(false);
	expect(await respond()).toBe('unavailable');
	expect(tracker.respond).toHaveBeenCalledOnce();
});

it('treats a concurrent response as already handled', async () => {
	const { tracker, respond } = setup();
	tracker.respond.mockRejectedValue(new ExecutionAlreadyResumingError('123'));
	expect(await respond()).toBe('unavailable');
});
