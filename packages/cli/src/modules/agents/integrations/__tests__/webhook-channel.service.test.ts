/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import jwt from 'jsonwebtoken';
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
import type { AgentCredentialLookupService } from '../agent-credential-lookup.service';
import type { AgentExecutionStreamChunk } from '../../types/agent-steering';
import { WebhookChannelService } from '../platforms/webhook/webhook-channel.service';
import type { CredentialsHelper } from '@/credentials-helper';

const webhook = (authentication: 'none' | 'headerAuth' | 'jwtAuth'): AgentIntegrationConfig => ({
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
	const credentials = mock<AgentCredentialLookupService>();
	const credentialsHelper = mock<CredentialsHelper>();
	// The fields of the two credential types, with their defaults.
	credentialsHelper.getCredentialsProperties.mockImplementation((type) =>
		type === 'jwtAuth'
			? [
					{ displayName: 'Key Type', name: 'keyType', type: 'string', default: 'passphrase' },
					{ displayName: 'Secret', name: 'secret', type: 'string', default: '' },
					{ displayName: 'Algorithm', name: 'algorithm', type: 'string', default: 'HS256' },
				]
			: [
					{ displayName: 'Name', name: 'name', type: 'string', default: '' },
					{ displayName: 'Value', name: 'value', type: 'string', default: '' },
				],
	);
	const logger = mock<Logger>();
	const service = new WebhookChannelService(
		agentRepository,
		settings,
		executionService,
		orchestrator,
		chatExecution,
		credentials,
		credentialsHelper,
		logger,
	);
	const respond = async (
		body: unknown = { input: 'Hi' },
		headers = {},
		abortSignal = new AbortController().signal,
	) => await service.respond({ agentId: 'agent-1', headers, body, abortSignal });
	return { respond, settings, executionService, orchestrator, chatExecution, credentials, logger };
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

	describe('with header auth', () => {
		const headerAgent = makeAgent({ integrations: [webhook('headerAuth')] });

		it('runs the agent for the configured header and checks the credential type', async () => {
			const { respond, credentials, orchestrator } = makeService(headerAgent);
			credentials.decryptForProject.mockResolvedValue({ name: 'X-Api-Key', value: 'key-1' });

			await expect(respond({ input: 'Hi' }, { 'x-api-key': 'key-1' })).resolves.toMatchObject({
				status: 200,
			});
			expect(credentials.decryptForProject).toHaveBeenCalledWith(
				'project-1',
				'cred-1',
				'httpHeaderAuth',
			);
			expect(orchestrator.executeForChatPublished).toHaveBeenCalled();
		});

		it('returns 403 for a wrong header before the body is read', async () => {
			const { respond, credentials, orchestrator } = makeService(headerAgent);
			credentials.decryptForProject.mockResolvedValue({ name: 'X-Api-Key', value: 'key-1' });

			await expect(respond({ input: [] }, { 'x-api-key': 'key-2' })).resolves.toMatchObject({
				status: 403,
			});
			expect(orchestrator.executeForChatPublished).not.toHaveBeenCalled();
		});

		it('returns 500 when the credential is missing, deleted, or of another type', async () => {
			const { respond, credentials, orchestrator } = makeService(headerAgent);
			credentials.decryptForProject.mockResolvedValue(null);

			await expect(respond()).resolves.toMatchObject({ status: 500 });
			expect(orchestrator.executeForChatPublished).not.toHaveBeenCalled();
		});
	});

	describe('with JWT auth', () => {
		const jwtAgent = makeAgent({ integrations: [webhook('jwtAuth')] });
		const jwtCredential = { keyType: 'passphrase', secret: 'secret-1', algorithm: 'HS256' };
		const bearer = (secret: string) => ({
			authorization: `Bearer ${jwt.sign({ sub: 'caller' }, secret, { algorithm: 'HS256' })}`,
		});

		it('runs the agent for a valid bearer token and checks the credential type', async () => {
			const { respond, credentials, orchestrator } = makeService(jwtAgent);
			credentials.decryptForProject.mockResolvedValue(jwtCredential);

			await expect(respond({ input: 'Hi' }, bearer('secret-1'))).resolves.toMatchObject({
				status: 200,
			});
			expect(credentials.decryptForProject).toHaveBeenCalledWith('project-1', 'cred-1', 'jwtAuth');
			expect(orchestrator.executeForChatPublished).toHaveBeenCalled();
		});

		it('verifies with the default algorithm when the credential stores only its secret', async () => {
			const { respond, credentials, orchestrator } = makeService(jwtAgent);
			// The editor does not save a field that keeps its default value.
			credentials.decryptForProject.mockResolvedValue({ secret: 'secret-1' });

			await expect(respond({ input: 'Hi' }, bearer('secret-1'))).resolves.toMatchObject({
				status: 200,
			});
			expect(orchestrator.executeForChatPublished).toHaveBeenCalled();
		});

		it('returns 401 without a token', async () => {
			const { respond, credentials, orchestrator } = makeService(jwtAgent);
			credentials.decryptForProject.mockResolvedValue(jwtCredential);

			await expect(respond()).resolves.toMatchObject({ status: 401 });
			expect(orchestrator.executeForChatPublished).not.toHaveBeenCalled();
		});

		it('returns 403 for a token signed with another secret', async () => {
			const { respond, credentials, orchestrator } = makeService(jwtAgent);
			credentials.decryptForProject.mockResolvedValue(jwtCredential);

			await expect(respond({ input: 'Hi' }, bearer('secret-2'))).resolves.toMatchObject({
				status: 403,
			});
			expect(orchestrator.executeForChatPublished).not.toHaveBeenCalled();
		});
	});

	it('looks up no credential for authentication none', async () => {
		const { respond, credentials } = makeService();

		await respond();

		expect(credentials.decryptForProject).not.toHaveBeenCalled();
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
				model: 'n8n-agent',
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

	describe('when the agent needs an approval', () => {
		const approval = (toolCallId: string) =>
			({
				type: 'tool-call-suspended',
				runId: 'run-1',
				toolCallId,
				toolName: 'send_email',
				suspendPayload: { type: 'approval', toolName: 'send_email', args: {} },
			}) as AgentExecutionStreamChunk;

		it('declines the action and returns the reply of the agent', async () => {
			const { respond, orchestrator, chatExecution } = makeService();
			orchestrator.executeForChatPublished.mockReturnValue(streamOf(approval('call-1')));
			orchestrator.resumeForChat.mockReturnValue(
				streamOf({ type: 'text-delta', id: 't2', delta: 'I could not send the email.' }),
			);

			const reply = await respond();

			expect(reply).toMatchObject({
				status: 200,
				body: { output: [{ content: [{ text: 'I could not send the email.' }] }] },
			});
			const [{ memory }] = orchestrator.executeForChatPublished.mock.calls[0];
			expect(orchestrator.resumeForChat).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: 'agent-1',
					projectId: 'project-1',
					runId: 'run-1',
					toolCallId: 'call-1',
					resumeData: {
						approved: false,
						reason: 'approval is not available on this channel, so nobody can approve it',
					},
					integrationType: 'webhook',
					expectedMemory: memory,
				}),
			);
			expect(chatExecution.cancelSessionSuspension).not.toHaveBeenCalled();
		});

		it('stops declining and returns 500 when the agent keeps asking', async () => {
			const { respond, orchestrator, executionService, chatExecution } = makeService();
			orchestrator.executeForChatPublished.mockReturnValue(streamOf(approval('call-1')));
			orchestrator.resumeForChat.mockImplementation(() => streamOf(approval('call-2')));
			executionService.findLatestSuspendedRun.mockResolvedValue(
				mock<AgentExecution>({ id: 'execution-1' }),
			);

			const reply = await respond();

			expect(reply).toMatchObject({
				status: 500,
				body: { error: { code: 'input_not_supported' } },
			});
			expect(orchestrator.resumeForChat).toHaveBeenCalledTimes(5);
			expect(chatExecution.cancelSessionSuspension).toHaveBeenCalled();
		});
	});

	it('cancels a run that waits for other input and returns 500', async () => {
		const { respond, orchestrator, executionService, chatExecution } = makeService();
		orchestrator.executeForChatPublished.mockReturnValue(
			streamOf({
				type: 'tool-call-suspended',
				runId: 'run-1',
				toolCallId: 'call-1',
				toolName: 'wait_for_form',
				suspendPayload: { type: 'form' },
			} as AgentExecutionStreamChunk),
		);
		executionService.findLatestSuspendedRun.mockResolvedValue(
			mock<AgentExecution>({ id: 'execution-1' }),
		);

		const reply = await respond();

		expect(reply).toMatchObject({
			status: 500,
			body: { error: { code: 'input_not_supported' } },
		});
		expect(orchestrator.resumeForChat).not.toHaveBeenCalled();
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

	it('logs the failure message without URL query values', async () => {
		const { respond, orchestrator, logger } = makeService();
		orchestrator.executeForChatPublished.mockReturnValue(
			streamOf({
				type: 'error',
				error: new Error('Request to https://api.example.com/v1/chat?key=key-123 failed'),
			}),
		);

		await respond();

		expect(logger.error).toHaveBeenCalledWith('Webhook agent turn failed', {
			error: 'Request to https://api.example.com/v1/chat failed',
		});
	});

	it('logs no failure when the caller leaves during the run', async () => {
		const { respond, orchestrator, logger } = makeService();
		const abort = new AbortController();
		orchestrator.executeForChatPublished.mockImplementation(() => {
			abort.abort();
			return streamOf({ type: 'error', error: new Error('This operation was aborted') });
		});

		await respond({ input: 'Hi' }, {}, abort.signal);

		expect(logger.error).not.toHaveBeenCalled();
	});
});
