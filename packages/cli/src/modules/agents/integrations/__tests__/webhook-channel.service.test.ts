/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import type { SerializableAgentState } from '@n8n/agents';
import { APPROVAL_RESUME_SCHEMA } from '@n8n/agents/tool';
import { zodToJsonSchema } from '@n8n/ai-utilities/json-schema';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { UrlService } from '@n8n/backend-services';
import { UserError } from '@n8n/errors';
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
import type { N8NCheckpointStorage } from '../n8n-checkpoint-storage';
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
	const checkpointStorage = mock<N8NCheckpointStorage>();
	const urlService = mock<UrlService>();
	urlService.getAgentWebhookUrl.mockImplementation(
		(agentId) => `https://n8n.example.com/agent-webhook/${agentId}`,
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
		checkpointStorage,
		urlService,
		logger,
	);
	const respond = async (
		body: unknown = { input: 'Hi' },
		headers = {},
		abortSignal = new AbortController().signal,
	) => await service.respond({ agentId: 'agent-1', headers, body, abortSignal });
	const decide = async (body: unknown = { approved: true }, headers = {}) =>
		await service.decide({
			agentId: 'agent-1',
			conversationId: 'c-1',
			runId: 'run-1',
			toolCallId: 'call-1',
			headers,
			body,
			abortSignal: new AbortController().signal,
		});
	return {
		respond,
		decide,
		settings,
		executionService,
		orchestrator,
		chatExecution,
		credentials,
		checkpointStorage,
		logger,
	};
}

const approvalResumeSchema = zodToJsonSchema(APPROVAL_RESUME_SCHEMA);

const approvalPayload = (overrides: Record<string, unknown> = {}) => ({
	type: 'approval',
	toolName: 'send_email',
	displayName: 'Send email',
	args: { to: 'ana@example.com' },
	...overrides,
});

const approval = (toolCallId: string, overrides: Record<string, unknown> = {}) =>
	({
		type: 'tool-call-suspended',
		runId: 'run-1',
		toolCallId,
		toolName: 'send_email',
		suspendPayload: approvalPayload(overrides),
		resumeSchema: approvalResumeSchema,
	}) as AgentExecutionStreamChunk;

/** The checkpoint of run-1 in conversation c-1, which waits for a decision on call-1. */
function pendingCheckpoint(
	overrides: Partial<SerializableAgentState> = {},
): SerializableAgentState {
	return {
		status: 'suspended',
		persistence: { threadId: 'agent-1:webhook:c-1', resourceId: 'integration:webhook:c-1' },
		pendingToolCalls: {
			'call-1': {
				toolCallId: 'call-1',
				toolName: 'send_email',
				input: {},
				suspended: true,
				runId: 'run-1',
				suspendPayload: approvalPayload({ supportsSessionApproval: true }),
				resumeSchema: approvalResumeSchema,
			},
		},
		...overrides,
	} as unknown as SerializableAgentState;
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

		await expect(respond()).resolves.toMatchObject({
			status: 409,
			body: { error: { code: 'conversation_busy' } },
		});
	});

	it('returns 409 approval_pending while an action in the conversation waits for a decision', async () => {
		const { respond, orchestrator, checkpointStorage } = makeService();
		orchestrator.executeForChatPublished.mockImplementation(async function* () {
			yield* [];
			throw new AgentTurnAlreadyRunningError();
		});
		checkpointStorage.findSuspendedForThread.mockResolvedValue(pendingCheckpoint());

		await expect(respond()).resolves.toMatchObject({
			status: 409,
			body: { error: { code: 'approval_pending', param: 'conversation' } },
		});
	});

	describe('when the agent needs an approval', () => {
		it('returns an approval request with its URL and does not resume the run', async () => {
			const { respond, orchestrator, chatExecution } = makeService();
			orchestrator.executeForChatPublished.mockReturnValue(
				streamOf({ type: 'text-delta', id: 't1', delta: 'I will send it.' }, approval('call-1')),
			);

			const reply = await respond();

			const [{ memory }] = orchestrator.executeForChatPublished.mock.calls[0];
			const conversationId = memory.threadId.replace('agent-1:webhook:', '');
			expect(reply).toMatchObject({
				status: 200,
				body: {
					status: 'completed',
					conversation: { id: conversationId },
					output: [
						{ type: 'message', content: [{ text: 'I will send it.' }] },
						{
							type: 'approval_request',
							id: 'call-1',
							name: 'send_email',
							display_name: 'Send email',
							arguments: '{"to":"ana@example.com"}',
							supports_session_approval: false,
							url: `https://n8n.example.com/agent-webhook/agent-1/approvals/${conversationId}/run-1/call-1`,
						},
					],
				},
			});
			expect(orchestrator.resumeForChat).not.toHaveBeenCalled();
			expect(chatExecution.cancelSessionSuspension).not.toHaveBeenCalled();
		});

		it('returns one approval request for each suspended action, with encoded URLs', async () => {
			const { respond, orchestrator } = makeService();
			orchestrator.executeForChatPublished.mockReturnValue(
				streamOf(approval('call-1'), approval('call/2')),
			);

			const reply = await respond();

			const output = (reply.body as { output: Array<{ type: string; url?: string }> }).output;
			expect(output.filter(({ type }) => type === 'approval_request')).toHaveLength(2);
			expect(output[2].url).toMatch(/\/run-1\/call%2F2$/);
		});

		it('cancels the run and returns 500 when another suspension is not an approval', async () => {
			const { respond, orchestrator, executionService, chatExecution } = makeService();
			orchestrator.executeForChatPublished.mockReturnValue(
				streamOf(approval('call-1'), {
					...approval('call-2'),
					resumeSchema: { type: 'object' },
				} as AgentExecutionStreamChunk),
			);
			executionService.findLatestSuspendedRun.mockResolvedValue(
				mock<AgentExecution>({ id: 'execution-1' }),
			);

			await expect(respond()).resolves.toMatchObject({
				status: 500,
				body: { error: { code: 'input_not_supported' } },
			});
			expect(chatExecution.cancelSessionSuspension).toHaveBeenCalled();
		});
	});

	describe('decide', () => {
		function makeDecideService(agent?: ProjectAgent) {
			const service = makeService(agent);
			service.executionService.findThreadById.mockResolvedValue(mock<AgentExecutionThread>());
			service.checkpointStorage.load.mockResolvedValue(pendingCheckpoint());
			service.orchestrator.resumeForChat.mockReturnValue(
				streamOf({ type: 'text-delta', id: 't2', delta: 'The email is sent.' }),
			);
			return service;
		}

		it('resumes the run of the conversation with the decision and returns the reply', async () => {
			const { decide, orchestrator, checkpointStorage } = makeDecideService();

			const reply = await decide({ approved: true });

			expect(checkpointStorage.load).toHaveBeenCalledWith('run-1', 'agent-1');
			expect(orchestrator.resumeForChat).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: 'agent-1',
					projectId: 'project-1',
					runId: 'run-1',
					toolCallId: 'call-1',
					resumeData: { approved: true },
					integrationType: 'webhook',
					expectedMemory: {
						threadId: 'agent-1:webhook:c-1',
						resourceId: 'integration:webhook:c-1',
					},
					allowBackgroundTasks: false,
				}),
			);
			expect(reply).toMatchObject({
				status: 200,
				body: {
					conversation: { id: 'c-1' },
					output: [{ type: 'message', content: [{ text: 'The email is sent.' }] }],
				},
			});
		});

		it.each([[{ approved: false }], [{ approved: true, scope: 'session' }]])(
			'passes the decision %o to the run',
			async (body) => {
				const { decide, orchestrator } = makeDecideService();

				await decide(body);

				expect(orchestrator.resumeForChat).toHaveBeenCalledWith(
					expect.objectContaining({ resumeData: body }),
				);
			},
		);

		it('returns the next approval request when the resumed run suspends again', async () => {
			const { decide, orchestrator } = makeDecideService();
			orchestrator.resumeForChat.mockReturnValue(streamOf(approval('call-2')));

			await expect(decide()).resolves.toMatchObject({
				body: { output: [{ type: 'message' }, { type: 'approval_request', id: 'call-2' }] },
			});
		});

		it.each([
			['a missing decision', {}, 'approved'],
			['a decision that is not a boolean', { approved: 'yes' }, 'approved'],
			['an unknown scope', { approved: true, scope: 'forever' }, 'scope'],
		])('returns 400 for %s', async (_, body, param) => {
			const { decide, orchestrator } = makeDecideService();

			await expect(decide(body)).resolves.toMatchObject({
				status: 400,
				body: { error: { code: 'invalid_request', param } },
			});
			expect(orchestrator.resumeForChat).not.toHaveBeenCalled();
		});

		it('returns 400 for a session approval of an action without it', async () => {
			const { decide, orchestrator, checkpointStorage } = makeDecideService();
			const checkpoint = pendingCheckpoint();
			const pending = checkpoint.pendingToolCalls['call-1'];
			if (pending.suspended) pending.suspendPayload = approvalPayload();
			checkpointStorage.load.mockResolvedValue(checkpoint);

			await expect(decide({ approved: true, scope: 'session' })).resolves.toMatchObject({
				status: 400,
				body: { error: { param: 'scope' } },
			});
			expect(orchestrator.resumeForChat).not.toHaveBeenCalled();
		});

		it.each([
			['a missing run', undefined],
			[
				'a run of another conversation',
				pendingCheckpoint({
					persistence: { threadId: 'agent-1:webhook:c-2', resourceId: 'integration:webhook:c-1' },
				}),
			],
			[
				'a run of another memory resource',
				pendingCheckpoint({
					persistence: { threadId: 'agent-1:webhook:c-1', resourceId: 'integration:webhook:c-2' },
				}),
			],
			[
				'a delegated run',
				pendingCheckpoint({
					persistence: {
						threadId: 'agent-1:webhook:c-1',
						resourceId: 'integration:webhook:c-1',
						delegated: true,
					},
				}),
			],
			['a run without this action', pendingCheckpoint({ pendingToolCalls: {} })],
			[
				'an action that waits for other input',
				pendingCheckpoint({
					pendingToolCalls: {
						'call-1': {
							toolCallId: 'call-1',
							toolName: 'wait_for_form',
							input: {},
							suspended: true,
							runId: 'run-1',
							suspendPayload: { type: 'form' },
							resumeSchema: { type: 'object' },
						},
					},
				}),
			],
		])('returns 404 for %s and does not resume', async (_, checkpoint) => {
			const { decide, orchestrator, checkpointStorage } = makeDecideService();
			checkpointStorage.load.mockResolvedValue(checkpoint);

			await expect(decide()).resolves.toMatchObject({
				status: 404,
				body: { error: { code: 'approval_not_found' } },
			});
			expect(orchestrator.resumeForChat).not.toHaveBeenCalled();
		});

		it('returns 404 for a run that expired or was already handled', async () => {
			const { decide, orchestrator, checkpointStorage } = makeDecideService();
			checkpointStorage.load.mockRejectedValue(
				new UserError('This action has already been handled'),
			);

			await expect(decide()).resolves.toMatchObject({
				status: 404,
				body: { error: { code: 'approval_not_found' } },
			});
			expect(orchestrator.resumeForChat).not.toHaveBeenCalled();
		});

		it('returns 404 for an unknown conversation before it reads the run', async () => {
			const { decide, executionService, checkpointStorage } = makeDecideService();
			executionService.findThreadById.mockResolvedValue(null);

			await expect(decide()).resolves.toMatchObject({
				status: 404,
				body: { error: { code: 'conversation_not_found' } },
			});
			expect(checkpointStorage.load).not.toHaveBeenCalled();
		});

		it('checks the channel authentication before it reads the run', async () => {
			const { decide, credentials, checkpointStorage } = makeDecideService(
				makeAgent({ integrations: [webhook('headerAuth')] }),
			);
			credentials.decryptForProject.mockResolvedValue({ name: 'X-Api-Key', value: 'key-1' });

			await expect(decide({ approved: true }, { 'x-api-key': 'key-2' })).resolves.toMatchObject({
				status: 403,
			});
			expect(checkpointStorage.load).not.toHaveBeenCalled();
		});

		it('returns 404 when the run is decided or expires after the check', async () => {
			const { decide, orchestrator, logger } = makeDecideService();
			orchestrator.resumeForChat.mockImplementation(async function* () {
				yield* [];
				throw new UserError('Checkpoint run-1 is expired and cannot be resumed');
			});

			await expect(decide()).resolves.toMatchObject({
				status: 404,
				body: { error: { code: 'approval_not_found' } },
			});
			expect(logger.error).not.toHaveBeenCalled();
		});

		it('keeps an error of the resumed run after its first chunk', async () => {
			const { decide, orchestrator } = makeDecideService();
			orchestrator.resumeForChat.mockImplementation(async function* () {
				yield { type: 'text-delta', id: 't2', delta: 'Sending' } as AgentExecutionStreamChunk;
				throw new UserError('The tool failed');
			});

			await expect(decide()).resolves.toMatchObject({
				status: 500,
				body: { error: { code: 'agent_error' } },
			});
		});

		it('returns 409 when another request resumes the run first', async () => {
			const { decide, orchestrator } = makeDecideService();
			orchestrator.resumeForChat.mockImplementation(async function* () {
				yield* [];
				throw new AgentTurnAlreadyRunningError();
			});

			await expect(decide()).resolves.toMatchObject({ status: 409 });
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
