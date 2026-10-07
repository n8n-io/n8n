import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { User, UserRepository } from '@n8n/db';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import type { AgentChatExecutionService } from '../agent-chat-execution.service';
import type { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import type { AgentExecutionService } from '../agent-execution.service';
import { AgentMessageQueueConsumer } from '../agent-message-queue-consumer.service';
import { AgentN8nChatUnavailableError } from '../agent-n8n-chat-unavailable.error';
import type { AgentMessageQueueService, ClaimedAgentMessage } from '../agent-message-queue.service';
import type { AgentQueuedPreviewStreamService } from '../agent-queued-preview-stream.service';
import type { AgentTestRunService } from '../agent-test-run.service';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentMessageQueue } from '../entities/agent-message-queue.entity';
import type { AgentMessageEntity } from '../entities/agent-message.entity';
import type { AgentChatBridge } from '../integrations/agent-chat-bridge';
import type { ChatIntegrationService } from '../integrations/chat-integration.service';
import type { AgentMessageQueueRepository } from '../repositories/agent-message-queue.repository';
import type { SystemAgentExecutionService } from '../system-agents/system-agent-execution.service';
import { SystemAgentRegistry } from '../system-agents/system-agent-registry';
import type { SystemAgentProvider } from '../system-agents/system-agent.types';
import type { AgentQueueDispatch, QueuedIntegrationMessage } from '../types/agent-queued-message';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

describe('AgentMessageQueueConsumer', () => {
	const queue = mock<AgentMessageQueueService>();
	const repository = mock<AgentMessageQueueRepository>();
	const executions = mock<AgentExecutionService>();
	const streams = mock<AgentQueuedPreviewStreamService>();
	const testRuns = mock<AgentTestRunService>();
	const users = mock<UserRepository>();
	const chatExecutions = mock<AgentChatExecutionService>();
	const integrations = mock<ChatIntegrationService>();
	const orchestrator = mock<AgentExecutionOrchestratorService>();
	const sender = { send: vi.fn(), close: vi.fn(async () => {}) };
	const systemAgentExecution = mock<SystemAgentExecutionService>();
	let systemAgents: SystemAgentRegistry;
	let consumer: AgentMessageQueueConsumer;

	function claim(threadId: string, integration = false): ClaimedAgentMessage {
		const payload: ClaimedAgentMessage['payload'] = integration
			? mock<QueuedIntegrationMessage>({
					kind: 'integration',
					message: 'input',
					credentialId: 'credential',
					platformThreadId: 'slack:channel:thread',
					messageContext: {
						platform: 'slack',
						integrationConnectionId: 'slack:credential',
						target: { type: 'thread', threadId: 'slack:channel:thread' },
						updatedAt: '2026-06-01T12:00:00.000Z',
					},
				})
			: { kind: 'preview', message: 'input', resourceId: 'draft-chat:user' };
		return {
			payload,
			item: mock<AgentMessageQueue>({
				id: threadId,
				threadId,
				message: mock<AgentMessageEntity>({ origin: { source: integration ? 'slack' : 'chat' } }),
				payload: integration
					? mock<AgentQueueDispatch>({ kind: 'integration', credentialId: 'credential' })
					: { kind: 'preview' },
			}),
			thread: mock<AgentExecutionThread>({
				id: threadId,
				agentId: 'agent',
				projectId: 'project',
				ownerId: integration ? null : 'user',
			}),
			admission: {
				executionId: `execution-${threadId}`,
				startedAt: new Date(),
				inputMessageIds: ['message-1'],
			},
			recording: {
				threadId,
				resourceId: 'draft-chat:user',
				agentId: 'agent',
				agentName: 'Agent',
				projectId: 'project',
				userMessage: 'input',
				source: integration ? 'slack' : 'chat',
				access: { accessScope: 'user', ownerId: 'user' },
			},
		};
	}

	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(userHasScopes).mockResolvedValue(true);
		systemAgents = new SystemAgentRegistry();
		users.findByIdWithRole.mockResolvedValue(mock<User>({ id: 'user', disabled: false }));
		repository.findThreadIds.mockResolvedValue([]);
		executions.getAbortSignal.mockImplementation(() => new AbortController().signal);
		streams.createSender.mockReturnValue(sender);
		chatExecutions.settle.mockImplementation(async (_id, finalize) => await finalize());
		testRuns.prepareDraftRun.mockResolvedValue({
			status: 'ready',
			sessionId: 'session',
			sessionMode: 'existing',
		});
		testRuns.executePreparedDraftRun.mockResolvedValue({
			status: 'completed',
			response: '',
			executionId: 'execution-session',
		});
		consumer = new AgentMessageQueueConsumer(
			queue,
			repository,
			executions,
			streams,
			testRuns,
			users,
			mock<CredentialsService>(),
			chatExecutions,
			integrations,
			orchestrator,
			mockLogger(),
			systemAgents,
			systemAgentExecution,
		);
	});

	afterEach(() => consumer.stop());

	it('runs independent sessions without waiting and reuses each claimed execution', async () => {
		const first = claim('first');
		first.payload.message = 'edited first message';
		first.recording.userMessage = first.payload.message;
		const second = claim('second');
		const waiting = createDeferredPromise();
		repository.findThreadIds.mockResolvedValue(['first', 'second']);
		queue.claimNext
			.mockResolvedValueOnce(first)
			.mockResolvedValueOnce(second)
			.mockResolvedValue(null);
		testRuns.executePreparedDraftRun.mockImplementation(async (input) => {
			if (input.sessionId === 'first') await waiting.promise;
			return {
				status: 'completed',
				response: '',
				executionId: input.admittedExecution!.executionId,
			};
		});
		consumer.start();
		try {
			await vi.waitFor(() =>
				expect(queue.settle).toHaveBeenCalledWith('second', second.admission.executionId),
			);
			expect(queue.settle).not.toHaveBeenCalledWith('first', first.admission.executionId);
			expect(users.findByIdWithRole).toHaveBeenCalledWith(first.thread.ownerId);
			expect(chatExecutions.register).toHaveBeenCalledWith(
				expect.objectContaining({ userId: first.thread.ownerId, threadId: 'first' }),
				expect.any(AbortController),
			);
			expect(sender.send).toHaveBeenCalledWith({
				type: 'execution-started',
				inputMessageIds: ['message-1'],
				executionId: first.admission.executionId,
				sessionId: 'first',
				message: 'edited first message',
			});
			expect(testRuns.prepareDraftRun).toHaveBeenCalledWith(
				expect.objectContaining({
					newSession: false,
					user: expect.objectContaining({ id: 'user' }),
				}),
			);
			expect(testRuns.executePreparedDraftRun).toHaveBeenCalledWith(
				expect.objectContaining({
					sessionId: 'first',
					sessionMode: 'existing',
					source: 'chat',
					admittedExecution: first.admission,
				}),
			);
		} finally {
			waiting.resolve();
		}
		await vi.waitFor(() =>
			expect(queue.settle).toHaveBeenCalledWith('first', first.admission.executionId),
		);
	});

	it('forwards a budget notice from the preview run to the stream', async () => {
		const item = claim('session');
		repository.findThreadIds.mockResolvedValue(['session']);
		queue.claimNext.mockResolvedValueOnce(item).mockResolvedValue(null);
		testRuns.executePreparedDraftRun.mockImplementation(async (input) => {
			input.onBudgetNotice?.();
			return {
				status: 'completed',
				response: '',
				executionId: input.admittedExecution!.executionId,
			};
		});
		consumer.start();
		await vi.waitFor(() =>
			expect(queue.settle).toHaveBeenCalledWith('session', item.admission.executionId),
		);
		expect(sender.send).toHaveBeenCalledWith({ type: 'budget-notice', code: 'budget.alert' });
	});

	it('runs n8n Chat messages against the published agent on the claimed execution', async () => {
		const item = claim('session');
		item.payload = { kind: 'n8n_chat', message: 'input', resourceId: 'n8n-chat:user' };
		item.item.payload = { kind: 'n8n_chat' };
		repository.findThreadIds.mockResolvedValue(['session']);
		queue.claimNext.mockResolvedValueOnce(item).mockResolvedValue(null);
		orchestrator.executeForN8nChatPublished.mockImplementation(async function* () {
			yield { type: 'text-delta', id: 'text', delta: 'hi' };
		});
		consumer.start();
		await vi.waitFor(() =>
			expect(queue.settle).toHaveBeenCalledWith('session', item.admission.executionId),
		);
		expect(chatExecutions.register).toHaveBeenCalledWith(
			expect.objectContaining({ userId: 'user', surface: 'n8n-chat' }),
			expect.any(AbortController),
		);
		expect(orchestrator.executeForN8nChatPublished).toHaveBeenCalledWith(
			expect.objectContaining({
				user: expect.objectContaining({ id: 'user' }),
				memory: { threadId: 'session', resourceId: 'n8n-chat:user' },
				sessionMode: 'existing',
				admittedExecution: item.admission,
			}),
		);
		expect(testRuns.prepareDraftRun).not.toHaveBeenCalled();
		expect(sender.send).toHaveBeenCalledWith({
			type: 'done',
			sessionId: 'session',
			executionId: item.admission.executionId,
		});
		expect(queue.recordFailure).not.toHaveBeenCalled();
	});

	it('does not finish an n8n Chat turn that suspended for HITL', async () => {
		const item = claim('session');
		item.payload = { kind: 'n8n_chat', message: 'input', resourceId: 'n8n-chat:user' };
		item.item.payload = { kind: 'n8n_chat' };
		repository.findThreadIds.mockResolvedValue(['session']);
		queue.claimNext.mockResolvedValueOnce(item).mockResolvedValue(null);
		orchestrator.executeForN8nChatPublished.mockImplementation(async function* () {
			yield {
				type: 'tool-call-suspended',
				toolCallId: 'call-1',
				toolName: 'ask_questions',
				runId: 'run-1',
				suspendPayload: { type: 'questions', questions: [] },
			};
		});
		consumer.start();
		await vi.waitFor(() =>
			expect(queue.settle).toHaveBeenCalledWith('session', item.admission.executionId),
		);
		expect(sender.send).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'tool-call-suspended' }),
		);
		expect(sender.send).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'done' }));
	});

	it('maps an n8n Chat stream failure to its errorCode via toChatErrorEvent', async () => {
		const thrown = new AgentN8nChatUnavailableError();
		const item = claim('session');
		item.payload = { kind: 'n8n_chat', message: 'input', resourceId: 'n8n-chat:user' };
		item.item.payload = { kind: 'n8n_chat' };
		repository.findThreadIds.mockResolvedValue(['session']);
		queue.claimNext.mockResolvedValueOnce(item).mockResolvedValue(null);
		// eslint-disable-next-line require-yield
		orchestrator.executeForN8nChatPublished.mockImplementation(async function* () {
			throw thrown;
		});
		consumer.start();
		await vi.waitFor(() =>
			expect(queue.settle).toHaveBeenCalledWith('session', item.admission.executionId),
		);
		expect(queue.recordFailure).toHaveBeenCalledWith(item, thrown, expect.any(AbortSignal));
		expect(sender.send).toHaveBeenCalledWith({
			type: 'error',
			message: thrown.message,
			errorCode: 'agent_unavailable',
		});
	});

	it.each([
		'missing owner',
		'deleted owner',
		'disabled owner',
		'revoked access',
		'invalid draft',
	] as const)('records %s on the claimed execution and releases the item', async (failure) => {
		const item = claim('session');
		switch (failure) {
			case 'missing owner':
				item.thread.ownerId = null;
				break;
			case 'deleted owner':
				users.findByIdWithRole.mockResolvedValue(null);
				break;
			case 'disabled owner':
				users.findByIdWithRole.mockResolvedValue(mock<User>({ id: 'user', disabled: true }));
				break;
			case 'revoked access':
				vi.mocked(userHasScopes).mockResolvedValue(false);
				break;
			case 'invalid draft':
				testRuns.prepareDraftRun.mockResolvedValue({
					status: 'agent_misconfigured',
					missing: ['model'],
				});
				break;
		}
		repository.findThreadIds.mockResolvedValue(['session']);
		queue.claimNext.mockResolvedValueOnce(item).mockResolvedValue(null);
		consumer.start();
		await vi.waitFor(() =>
			expect(queue.settle).toHaveBeenCalledWith('session', item.admission.executionId),
		);
		expect(queue.recordFailure).toHaveBeenCalledWith(
			item,
			expect.objectContaining({
				message:
					failure === 'invalid draft'
						? 'This agent is not ready to run yet.'
						: 'You can no longer execute this agent',
			}),
			expect.any(AbortSignal),
		);
		expect(testRuns.executePreparedDraftRun).not.toHaveBeenCalled();
		if (failure !== 'invalid draft') {
			expect(chatExecutions.register).not.toHaveBeenCalled();
			expect(testRuns.prepareDraftRun).not.toHaveBeenCalled();
		}
		if (failure === 'missing owner') expect(users.findByIdWithRole).not.toHaveBeenCalled();
		expect(sender.send).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
	});

	it('leaves integration work pending until its bridge is available and stops admission during shutdown', async () => {
		const item = claim('session', true);
		const checked = createDeferredPromise();
		const resume = createDeferredPromise();
		const release = vi.fn();
		repository.findThreadIds.mockResolvedValue(['session']);
		queue.claimNext.mockImplementationOnce(async (_threadId, canConsume) => {
			item.item.message.origin = null;
			await expect(canConsume(item.item, item.thread, {})).rejects.toThrow(
				'Queued integration input has no source',
			);
			expect(repository.findPublishedConnection).not.toHaveBeenCalled();
			item.item.message.origin = { source: 'slack' };
			expect(await canConsume(item.item, item.thread, {})).toBe(false);
			integrations.acquireQueueBridge.mockReturnValue({ bridge: mock<AgentChatBridge>(), release });
			expect(await canConsume(item.item, item.thread, {})).toBe(true);
			expect(integrations.acquireQueueBridge).toHaveBeenCalledWith('agent', 'slack', 'credential');
			checked.resolve();
			await resume.promise;
			expect(await canConsume(item.item, item.thread, {})).toBe(false);
			return null;
		});
		repository.findPublishedConnection.mockResolvedValue(
			mock<AgentIntegrationConfig>({ type: 'slack', credentialId: 'credential' }),
		);
		consumer.start();
		await checked.promise;
		consumer.stop();
		resume.resolve();
		await vi.waitFor(() => expect(release).toHaveBeenCalledOnce());
		expect(queue.recordFailure).not.toHaveBeenCalled();
	});

	it.each(['accepted', 'claim fails'] as const)(
		'releases the reserved bridge after the message is %s during handover',
		async (outcome) => {
			const item = claim('session', true);
			const bridge = mock<AgentChatBridge>();
			const release = vi.fn();
			const running = createDeferredPromise();
			repository.findThreadIds.mockResolvedValue(['session']);
			repository.findPublishedConnection.mockResolvedValue(
				mock<AgentIntegrationConfig>({ type: 'slack', credentialId: 'credential' }),
			);
			integrations.acquireQueueBridge.mockReturnValue({ bridge, release });
			bridge.consumeQueuedMessage.mockReturnValue(running.promise);
			queue.claimNext
				.mockImplementationOnce(async (_threadId, canConsume) => {
					expect(await canConsume(item.item, item.thread, {})).toBe(true);
					// Teardown now refuses new consumers. The admitted consumer keeps its bridge.
					integrations.acquireQueueBridge.mockReturnValue(undefined);
					integrations.getBridge.mockReturnValue(undefined);
					if (outcome === 'claim fails') throw new Error('Commit failed');
					return item;
				})
				.mockResolvedValue(null);
			consumer.start();
			try {
				if (outcome === 'accepted') {
					await vi.waitFor(() =>
						expect(bridge.consumeQueuedMessage).toHaveBeenCalledWith(
							item.payload,
							item.thread.id,
							item.admission,
							expect.any(AbortSignal),
							expect.objectContaining({ credentialId: 'credential' }),
						),
					);
					expect(release).not.toHaveBeenCalled();
					expect(repository.findPublishedConnection).toHaveBeenCalledWith(
						'agent',
						'project',
						'slack',
						'credential',
					);
				}
			} finally {
				running.resolve();
			}
			await vi.waitFor(() => expect(release).toHaveBeenCalledOnce());
			expect(queue.recordFailure).not.toHaveBeenCalled();
			if (outcome === 'claim fails') expect(bridge.consumeQueuedMessage).not.toHaveBeenCalled();
			else expect(queue.settle).toHaveBeenCalledWith(item.thread.id, item.admission.executionId);
		},
	);

	it('records a removed integration as a failure instead of leaving it pending', async () => {
		const item = claim('session', true);
		repository.findThreadIds.mockResolvedValue(['session']);
		queue.claimNext
			.mockImplementationOnce(async (_threadId, canConsume) => {
				expect(await canConsume(item.item, item.thread, {})).toBe(true);
				return item;
			})
			.mockResolvedValue(null);
		consumer.start();
		await vi.waitFor(() =>
			expect(queue.settle).toHaveBeenCalledWith('session', item.admission.executionId),
		);
		expect(queue.recordFailure).toHaveBeenCalledWith(
			item,
			expect.objectContaining({ message: 'The message integration is no longer configured' }),
			expect.any(AbortSignal),
		);
	});
	describe('system agents', () => {
		function registerSystemAgent(authorized = true) {
			const provider = {
				agentId: 'agent',
				name: 'System Agent',
				authorize: vi.fn(async () => authorized),
				prepareTurn: vi.fn(),
			} satisfies SystemAgentProvider;
			systemAgents.register(provider);
			return provider;
		}

		function systemClaim(threadId: string): ClaimedAgentMessage {
			const item = claim(threadId);
			return {
				...item,
				payload: { kind: 'system', message: 'input', resourceId: 'draft-chat:user' },
				item: mock<AgentMessageQueue>({ ...item.item, payload: { kind: 'system' } }),
			};
		}

		async function consumeOne(item: ClaimedAgentMessage) {
			repository.findThreadIds.mockResolvedValue([item.thread.id]);
			queue.claimNext.mockResolvedValueOnce(item).mockResolvedValue(null);
			consumer.start();
			await vi.waitFor(() =>
				expect(queue.settle).toHaveBeenCalledWith(item.thread.id, item.admission.executionId),
			);
		}

		it('routes a system message to the system-agent runtime after the floor check', async () => {
			const provider = registerSystemAgent();
			const item = systemClaim('session');
			systemAgentExecution.consume.mockImplementation(async (_claim, _user, _signal, send) => {
				send({ type: 'done', sessionId: 'session', executionId: item.admission.executionId });
			});

			await consumeOne(item);

			expect(systemAgentExecution.consume).toHaveBeenCalledWith(
				item,
				expect.objectContaining({ id: 'user' }),
				expect.any(AbortSignal),
				sender.send,
			);
			// The runtime floor (`project:read`) and the provider decide access,
			// not the project `agent:execute` scope.
			expect(userHasScopes).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'user' }),
				['project:read'],
				false,
				{ projectId: 'project' },
			);
			expect(userHasScopes).not.toHaveBeenCalledWith(
				expect.anything(),
				['agent:execute'],
				expect.anything(),
				expect.anything(),
			);
			expect(provider.authorize).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'user' }),
				'project',
			);
			expect(testRuns.prepareDraftRun).not.toHaveBeenCalled();
			expect(chatExecutions.register).toHaveBeenCalledWith(
				expect.objectContaining({ userId: 'user', threadId: 'session' }),
				expect.any(AbortController),
			);
			expect(sender.send).toHaveBeenCalledWith(expect.objectContaining({ type: 'done' }));
			expect(queue.recordFailure).not.toHaveBeenCalled();
		});

		it('records a failure when the provider no longer authorizes the owner', async () => {
			registerSystemAgent(false);
			const item = systemClaim('session');

			await consumeOne(item);

			expect(queue.recordFailure).toHaveBeenCalledWith(
				item,
				expect.objectContaining({ message: 'You can no longer execute this agent' }),
				expect.any(AbortSignal),
			);
			expect(systemAgentExecution.consume).not.toHaveBeenCalled();
		});

		it('records a failure when the owner can no longer read the working project', async () => {
			const provider = registerSystemAgent();
			vi.mocked(userHasScopes).mockResolvedValue(false);
			const item = systemClaim('session');

			await consumeOne(item);

			expect(queue.recordFailure).toHaveBeenCalled();
			expect(provider.authorize).not.toHaveBeenCalled();
			expect(systemAgentExecution.consume).not.toHaveBeenCalled();
		});

		it('records a failure for a system message without a registered provider', async () => {
			const item = systemClaim('session');

			await consumeOne(item);

			expect(queue.recordFailure).toHaveBeenCalled();
			expect(systemAgentExecution.consume).not.toHaveBeenCalled();
		});

		it('keeps the agent:execute check for Preview messages of a system agent id', async () => {
			registerSystemAgent();
			const item = claim('session');

			await consumeOne(item);

			expect(userHasScopes).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'user' }),
				['agent:execute'],
				false,
				{ projectId: 'project' },
			);
			expect(systemAgentExecution.consume).not.toHaveBeenCalled();
			expect(testRuns.prepareDraftRun).toHaveBeenCalled();
		});
	});
});
