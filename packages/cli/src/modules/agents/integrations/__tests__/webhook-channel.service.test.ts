/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { AgentChatExecutionService } from '../../agent-chat-execution.service';
import type { AgentExecutionOrchestratorService } from '../../agent-execution-orchestrator.service';
import type { AgentExecutionService } from '../../agent-execution.service';
import { AgentTurnAlreadyRunningError } from '../../agent-turn-already-running.error';
import type { AgentsSettingsService } from '../../agents-settings.service';
import type { AgentExecution } from '../../entities/agent-execution.entity';
import type { AgentExecutionThread } from '../../entities/agent-execution-thread.entity';
import type { ProjectAgent } from '../../entities/agent.entity';
import type { AgentRepository } from '../../repositories/agent.repository';
import type { AgentExecutionStreamChunk } from '../../types/agent-steering';
import { WebhookChannelService } from '../platforms/webhook/webhook-channel.service';

const webhook = (authentication: 'none' | 'headerAuth'): AgentIntegrationConfig => ({
	type: 'webhook',
	credentialId: authentication === 'none' ? '' : 'cred-1',
	settings: { authentication },
});

function makeAgent(overrides: Partial<ProjectAgent> = {}): ProjectAgent {
	return {
		id: 'agent-1',
		projectId: 'project-1',
		activeVersionId: 'version-1',
		activeVersion: { schema: { model: 'anthropic/claude-sonnet-4-5' } },
		integrations: [webhook('none')],
		...overrides,
	} as unknown as ProjectAgent;
}

async function* streamOf(...chunks: AgentExecutionStreamChunk[]) {
	for (const chunk of chunks) yield await Promise.resolve(chunk);
}

function makeService(agent: ProjectAgent | null = makeAgent()) {
	const agentRepository = mock<AgentRepository>();
	agentRepository.findById.mockResolvedValue(agent);
	const settings = mock<AgentsSettingsService>();
	settings.getEnabled.mockResolvedValue(true);
	const executionService = mock<AgentExecutionService>();
	const orchestrator = mock<AgentExecutionOrchestratorService>();
	orchestrator.executeForChatPublished.mockReturnValue(
		streamOf({ type: 'text-delta', id: 't1', delta: 'Hello' }),
	);
	const chatExecution = mock<AgentChatExecutionService>();
	const logger = mock<Logger>();
	const service = new WebhookChannelService(
		agentRepository,
		settings,
		executionService,
		orchestrator,
		chatExecution,
		logger,
	);
	const respond = async (
		body: unknown = { input: 'Hi' },
		abortSignal = new AbortController().signal,
	) => await service.respond({ agentId: 'agent-1', headers: {}, body, abortSignal });
	return { respond, settings, executionService, orchestrator, chatExecution, logger };
}

describe('WebhookChannelService', () => {
	it.each([
		['an unknown agent', null],
		['an unpublished agent', makeAgent({ activeVersionId: null })],
		['an agent without a webhook channel', makeAgent({ integrations: [] })],
		['a webhook draft', makeAgent({ integrations: [{ type: 'webhook', credentialId: '' }] })],
	])('returns 404 for %s', async (_, agent) => {
		const { respond, orchestrator } = makeService(agent);

		await expect(respond()).resolves.toMatchObject({ status: 404 });
		expect(orchestrator.executeForChatPublished).not.toHaveBeenCalled();
	});

	it('returns 404 while agents are disabled', async () => {
		const { respond, settings } = makeService();
		settings.getEnabled.mockResolvedValue(false);

		await expect(respond()).resolves.toMatchObject({ status: 404 });
	});

	it('fails closed for an authentication it cannot check yet', async () => {
		const { respond, orchestrator } = makeService(
			makeAgent({ integrations: [webhook('headerAuth')] }),
		);

		await expect(respond()).resolves.toMatchObject({ status: 500 });
		expect(orchestrator.executeForChatPublished).not.toHaveBeenCalled();
	});

	it('returns 400 for an invalid body', async () => {
		const { respond } = makeService();

		await expect(respond({ input: [] })).resolves.toMatchObject({ status: 400 });
	});

	it('starts a new conversation in its own webhook thread, without episodic memory or background work', async () => {
		const { respond, orchestrator } = makeService();

		const reply = await respond();

		const [config] = orchestrator.executeForChatPublished.mock.calls[0];
		const conversationId = config.memory.threadId.replace('agent-1:webhook:', '');
		expect(config).toMatchObject({
			agentId: 'agent-1',
			projectId: 'project-1',
			message: 'Hi',
			memory: { resourceId: `integration:webhook:${conversationId}` },
			integrationType: 'webhook',
			sessionMode: 'new',
			allowBackgroundTasks: false,
		});
		expect(reply).toMatchObject({
			status: 200,
			body: {
				model: 'anthropic/claude-sonnet-4-5',
				conversation: { id: conversationId },
				output: [{ content: [{ text: 'Hello' }] }],
			},
		});
	});

	it('continues a known conversation', async () => {
		const { respond, executionService, orchestrator } = makeService();
		executionService.findThreadById.mockResolvedValue(mock<AgentExecutionThread>());

		await respond({ input: 'Hi', conversation: 'c-1' });

		expect(executionService.findThreadById).toHaveBeenCalledWith('agent-1:webhook:c-1');
		expect(orchestrator.executeForChatPublished.mock.calls[0][0]).toMatchObject({
			memory: { threadId: 'agent-1:webhook:c-1' },
			sessionMode: 'existing',
		});
	});

	it('returns 404 for an unknown conversation', async () => {
		const { respond, executionService, orchestrator } = makeService();
		executionService.findThreadById.mockResolvedValue(null);

		await expect(respond({ input: 'Hi', conversation: 'c-1' })).resolves.toMatchObject({
			status: 404,
		});
		expect(orchestrator.executeForChatPublished).not.toHaveBeenCalled();
	});

	it('replies with the text after the last tool call', async () => {
		const { respond, orchestrator } = makeService();
		orchestrator.executeForChatPublished.mockReturnValue(
			streamOf(
				{ type: 'text-delta', id: 't1', delta: 'Let me check.' },
				{ type: 'tool-call', toolCallId: 'c', toolName: 'search', input: {} },
				{ type: 'text-delta', id: 't2', delta: 'It is ' },
				{ type: 'text-delta', id: 't2', delta: 'sunny.' },
			),
		);

		await expect(respond()).resolves.toMatchObject({
			body: { output: [{ content: [{ text: 'It is sunny.' }] }] },
		});
	});

	it('returns 409 while another turn runs in the conversation', async () => {
		const { respond, orchestrator } = makeService();
		orchestrator.executeForChatPublished.mockImplementation(async function* () {
			yield* [];
			throw new AgentTurnAlreadyRunningError();
		});

		await expect(respond()).resolves.toMatchObject({ status: 409 });
	});

	it('cancels a run that waits for approval and returns 500', async () => {
		const { respond, orchestrator, executionService, chatExecution } = makeService();
		orchestrator.executeForChatPublished.mockReturnValue(
			streamOf({ type: 'tool-call-suspended' } as AgentExecutionStreamChunk),
		);
		executionService.findLatestSuspendedRun.mockResolvedValue(
			mock<AgentExecution>({ id: 'execution-1' }),
		);

		const reply = await respond();

		expect(reply).toMatchObject({
			status: 500,
			body: { error: { code: 'approval_not_supported' } },
		});
		const [{ threadId }] = orchestrator.executeForChatPublished.mock.calls[0].map((c) => c.memory);
		expect(chatExecution.cancelSessionSuspension).toHaveBeenCalledWith(
			'agent-1',
			threadId,
			'execution-1',
		);
	});

	it('returns 500 without the internal message when the run fails', async () => {
		const { respond, orchestrator } = makeService();
		orchestrator.executeForChatPublished.mockReturnValue(
			streamOf({ type: 'error', error: new Error('secret internal detail') }),
		);

		const reply = await respond();

		expect(reply.status).toBe(500);
		expect(JSON.stringify(reply.body)).not.toContain('secret internal detail');
	});

	it('logs no failure when the caller leaves during the run', async () => {
		const { respond, orchestrator, logger } = makeService();
		const abort = new AbortController();
		orchestrator.executeForChatPublished.mockImplementation(() => {
			abort.abort();
			return streamOf({ type: 'error', error: new Error('This operation was aborted') });
		});

		await respond({ input: 'Hi' }, abort.signal);

		expect(logger.error).not.toHaveBeenCalled();
	});
});
