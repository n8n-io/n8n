import type { Logger } from '@n8n/backend-common';
import type { TransactionRunner, User } from '@n8n/db';
import { ConflictError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { AgentChatExecutionService } from '../../agent-chat-execution.service';
import type { AgentExecutionService } from '../../agent-execution.service';
import type {
	AgentMessageQueueService,
	ClaimedAgentMessage,
} from '../../agent-message-queue.service';
import type {
	AgentTurnExecutionService,
	AgentTurnRequest,
} from '../../agent-turn-execution.service';
import type { AgentExecutionThread } from '../../entities/agent-execution-thread.entity';
import type { N8NCheckpointStorage } from '../../integrations/n8n-checkpoint-storage';
import type {
	AgentExecutionRepository,
	AgentExecutionUsageRow,
} from '../../repositories/agent-execution.repository';
import type { AgentExecutionThreadRepository } from '../../repositories/agent-execution-thread.repository';
import type { AgentRepository } from '../../repositories/agent.repository';
import type { AgentExecutionStreamChunk } from '../../types/agent-steering';
import { SystemAgentExecutionService } from '../system-agent-execution.service';
import { SystemAgentRegistry } from '../system-agent-registry';
import type {
	SystemAgentProvider,
	SystemAgentTurn,
	SystemAgentTurnHandle,
	SystemAgentWorkspaceSource,
} from '../system-agent.types';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

const AGENT_ID = 'test-assistant';
const user = mock<User>({ id: 'user-1' });
const thread = {
	id: 'thread-1',
	agentId: AGENT_ID,
	agentName: 'Test Assistant',
	projectId: 'project-1',
	accessScope: 'user',
	ownerId: 'user-1',
	parentThreadId: null,
} as AgentExecutionThread;

/** The checkpoint of a turn that waits for the answer to one tool call. */
function suspendedCheckpoint(resourceId = 'draft-chat:user-1') {
	return {
		runId: 'run-1',
		pendingToolCalls: {
			'tc-1': {
				toolCallId: 'tc-1',
				toolName: 'ask-user',
				input: {},
				suspended: true,
				suspendPayload: { requestId: 'req-1' },
				resumeSchema: {},
				runId: 'run-1',
			},
		},
		persistence: {
			threadId: 'thread-1',
			resourceId,
			hostMetadata: { turnOptions: { runId: 'host-run-1' } },
		},
	};
}

/** A provider-defined lease type. The runtime never looks inside it. */
interface TestLease {
	sandboxName: string;
}

function setup(
	chunks: AgentExecutionStreamChunk[] = [],
	workspace?: SystemAgentWorkspaceSource<TestLease>,
) {
	const logger = mock<Logger>();
	const registry = new SystemAgentRegistry();
	const threadRepository = mock<AgentExecutionThreadRepository>();
	const executionRepository = mock<AgentExecutionRepository>();
	const turnExecutionService = mock<AgentTurnExecutionService>();
	const messageQueue = mock<AgentMessageQueueService>();
	const checkpointStorage = mock<N8NCheckpointStorage>();
	const executionService = mock<AgentExecutionService>();
	const chatExecutionService = mock<AgentChatExecutionService>();
	const agentRepository = mock<AgentRepository>();

	const onChunk = vi.fn();
	const onSettled = vi.fn(async () => {});
	const handle: SystemAgentTurnHandle = {
		agent: { name: 'runtime-agent' } as unknown as SystemAgentTurnHandle['agent'],
		input: 'model input',
		hostMetadata: { turnOptions: { runId: 'host-run-1' } },
		onChunk,
		onSettled,
	};
	const provider = {
		agentId: AGENT_ID,
		name: 'Test Assistant',
		authorize: vi.fn(async (_user: User, _projectId: string) => true),
		prepareTurn: vi.fn(async (_turn: SystemAgentTurn<TestLease>) => handle),
		normalizeResumeData: vi.fn((data: unknown) => ({ normalized: data })),
		...(workspace ? { workspace } : {}),
	} satisfies SystemAgentProvider<TestLease>;
	registry.register(provider);

	threadRepository.findOwnedById.mockResolvedValue(thread);
	threadRepository.findChildSessions.mockResolvedValue([]);
	executionRepository.findExecution.mockResolvedValue(null);
	// Collect the prepared request, then stream the scripted chunks.
	const prepared: AgentTurnRequest[] = [];
	turnExecutionService.execute.mockImplementation(async function* (config) {
		prepared.push(await config.prepare());
		yield* chunks;
	});

	const txRunner = mock<TransactionRunner>();
	const service = new SystemAgentExecutionService(
		logger,
		registry,
		agentRepository,
		threadRepository,
		executionRepository,
		executionService,
		turnExecutionService,
		messageQueue,
		chatExecutionService,
		checkpointStorage,
		txRunner,
		mock(),
	);

	return {
		service,
		logger,
		provider,
		handle,
		onChunk,
		onSettled,
		prepared,
		threadRepository,
		executionRepository,
		turnExecutionService,
		messageQueue,
		checkpointStorage,
		txRunner,
		executionService,
		chatExecutionService,
		agentRepository,
		registry,
	};
}

const suspendedChunk = {
	type: 'tool-call-suspended',
	runId: 'run-1',
	toolCallId: 'tc-1',
	toolName: 'ask-user',
	input: {},
	suspendPayload: { requestId: 'req-1' },
} as unknown as AgentExecutionStreamChunk;

function claimFor(options: Record<string, unknown> = {}): ClaimedAgentMessage {
	return {
		item: { id: 'queue-1' },
		thread,
		payload: {
			kind: 'system',
			message: 'Build me a workflow',
			resourceId: 'draft-chat:user-1',
			options,
		},
		admission: { executionId: 'exec-1', startedAt: new Date(), inputMessageIds: ['m-1'] },
		recording: { threadId: 'thread-1' },
	} as unknown as ClaimedAgentMessage;
}

const textChunk = { type: 'text-delta', id: 't-1', delta: 'Hello' } as AgentExecutionStreamChunk;

function workspaceSource() {
	const lease: TestLease = { sandboxName: 'sandbox-thread-1' };
	const source = {
		acquire: vi.fn(async (): Promise<TestLease | undefined> => lease),
		release: vi.fn(async () => {}),
		destroy: vi.fn(async () => {}),
	} satisfies SystemAgentWorkspaceSource<TestLease>;
	return { lease, source };
}

const workspaceScope = {
	agentId: AGENT_ID,
	threadId: 'thread-1',
	projectId: 'project-1',
	user,
};

describe('SystemAgentExecutionService', () => {
	beforeEach(() => {
		vi.mocked(userHasScopes).mockReset().mockResolvedValue(true);
	});

	describe('sendMessage', () => {
		it('enqueues a system message with the provider turn options', async () => {
			const { service, messageQueue, provider } = setup();

			await service.sendMessage({
				agentId: AGENT_ID,
				user,
				threadId: 'thread-1',
				message: 'hello',
				options: { runId: 'run-1', timeZone: 'Europe/Helsinki' },
				hidden: true,
			});

			expect(provider.authorize).toHaveBeenCalledWith(user, 'project-1');
			expect(messageQueue.enqueue).toHaveBeenCalledWith({
				agentId: AGENT_ID,
				projectId: 'project-1',
				threadId: 'thread-1',
				sessionMode: 'existing',
				source: 'chat',
				payload: {
					kind: 'system',
					userId: 'user-1',
					message: 'hello',
					resourceId: 'draft-chat:user-1',
					options: { runId: 'run-1', timeZone: 'Europe/Helsinki' },
					hidden: true,
				},
			});
		});

		it('refuses a user the provider does not authorize', async () => {
			const { service, messageQueue, provider } = setup();
			provider.authorize.mockResolvedValue(false);

			await expect(
				service.sendMessage({ agentId: AGENT_ID, user, threadId: 'thread-1', message: 'hello' }),
			).rejects.toThrow(NotFoundError);
			expect(messageQueue.enqueue).not.toHaveBeenCalled();
		});

		it('refuses a thread the user does not own', async () => {
			const { service, threadRepository, messageQueue } = setup();
			threadRepository.findOwnedById.mockResolvedValue(null);

			await expect(
				service.sendMessage({ agentId: AGENT_ID, user, threadId: 'thread-1', message: 'hello' }),
			).rejects.toThrow(NotFoundError);
			expect(messageQueue.enqueue).not.toHaveBeenCalled();
		});
	});

	describe('consume', () => {
		it('prepares the turn and runs the provider handle on the Agents runtime', async () => {
			const { service, provider, handle, turnExecutionService, prepared } = setup([textChunk]);
			const signal = new AbortController().signal;

			await service.consume(claimFor({ runId: 'run-1' }), user, signal, vi.fn());

			expect(provider.prepareTurn).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'start',
					user,
					thread,
					resourceId: 'draft-chat:user-1',
					executionId: 'exec-1',
					message: 'Build me a workflow',
					attachments: [],
					options: { runId: 'run-1' },
				}),
			);
			expect(turnExecutionService.execute).toHaveBeenCalledWith(
				expect.objectContaining({
					agentInstance: handle.agent,
					admittedExecution: expect.objectContaining({ executionId: 'exec-1' }),
					context: { projectId: 'project-1', agentId: AGENT_ID, threadId: 'thread-1' },
				}),
			);
			expect(prepared[0]).toMatchObject({
				type: 'start',
				input: 'model input',
				options: {
					persistence: {
						threadId: 'thread-1',
						resourceId: 'draft-chat:user-1',
						hostMetadata: { turnOptions: { runId: 'host-run-1' } },
					},
				},
			});
		});

		it('hides the user message from the transcript when the handle asks for it', async () => {
			const { service, handle, prepared } = setup();
			handle.hideUserMessage = true;

			await service.consume(claimFor(), user, new AbortController().signal, vi.fn());

			expect(prepared[0].recording).toMatchObject({ hideUserMessageFromTranscript: true });
		});

		it('forwards chunks to the handle and the client, and settles as completed', async () => {
			const { service, onChunk, onSettled } = setup([textChunk]);
			const send = vi.fn();

			await service.consume(claimFor(), user, new AbortController().signal, send);

			expect(onChunk).toHaveBeenCalledWith(textChunk);
			expect(send).toHaveBeenCalledWith(expect.objectContaining({ type: 'text-delta' }));
			expect(onSettled).toHaveBeenCalledWith({
				status: 'completed',
				executionId: 'exec-1',
				error: undefined,
			});
			expect(send).toHaveBeenLastCalledWith({
				type: 'done',
				sessionId: 'thread-1',
				executionId: 'exec-1',
			});
		});

		it('settles as suspended after a tool suspends, without a done event', async () => {
			const { service, onSettled } = setup([suspendedChunk]);
			const send = vi.fn();

			await service.consume(claimFor(), user, new AbortController().signal, send);

			expect(onSettled).toHaveBeenCalledWith(expect.objectContaining({ status: 'suspended' }));
			expect(send).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'done' }));
		});

		it('settles as errored with the error of an error chunk', async () => {
			const failure = new Error('model failed');
			const { service, onSettled } = setup([
				{ type: 'error', error: failure } as AgentExecutionStreamChunk,
			]);

			await service.consume(claimFor(), user, new AbortController().signal, vi.fn());

			expect(onSettled).toHaveBeenCalledWith({
				status: 'errored',
				executionId: 'exec-1',
				error: failure,
			});
		});

		it('settles as cancelled when the recorded execution was cancelled', async () => {
			const { service, onSettled, executionRepository } = setup([textChunk]);
			executionRepository.findExecution.mockResolvedValue({ status: 'cancelled' } as never);

			await service.consume(claimFor(), user, new AbortController().signal, vi.fn());

			expect(onSettled).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
		});

		it('settles as errored and rethrows when the turn throws', async () => {
			const { service, onSettled, turnExecutionService } = setup();
			const failure = new Error('stream broke');
			// eslint-disable-next-line require-yield
			turnExecutionService.execute.mockImplementation(async function* () {
				throw failure;
			});

			await expect(
				service.consume(claimFor(), user, new AbortController().signal, vi.fn()),
			).rejects.toThrow('stream broke');
			expect(onSettled).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'errored', error: failure }),
			);
		});

		it('does not prepare a turn when the claim is already aborted', async () => {
			const { service, provider } = setup();
			const controller = new AbortController();
			controller.abort();

			await expect(service.consume(claimFor(), user, controller.signal, vi.fn())).rejects.toThrow();
			expect(provider.prepareTurn).not.toHaveBeenCalled();
		});
	});

	describe('resume', () => {
		it('finds the suspended tool call in the checkpoint and prepares a resume turn', async () => {
			const { service, provider, checkpointStorage, prepared } = setup([textChunk]);
			checkpointStorage.findSuspendedForThread.mockResolvedValue(suspendedCheckpoint() as never);

			const result = await service.resume({
				agentId: AGENT_ID,
				user,
				threadId: 'thread-1',
				resumeData: { approved: true },
			});
			await result.done;

			expect(result).toMatchObject({ runId: 'run-1', toolCallId: 'tc-1' });
			expect(checkpointStorage.findSuspendedForThread).toHaveBeenCalledWith(AGENT_ID, 'thread-1');
			expect(provider.prepareTurn).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'resume',
					thread,
					resourceId: 'draft-chat:user-1',
					runId: 'run-1',
					toolCallId: 'tc-1',
					checkpointHostMetadata: { turnOptions: { runId: 'host-run-1' } },
					resumeData: { approved: true },
				}),
			);
			expect(prepared[0]).toMatchObject({
				type: 'resume',
				resumeData: { approved: true },
				options: { runId: 'run-1', toolCallId: 'tc-1' },
			});
		});

		it('refuses when no tool call waits for input', async () => {
			const { service, provider, checkpointStorage } = setup();
			checkpointStorage.findSuspendedForThread.mockResolvedValue(null);

			await expect(
				service.resume({ agentId: AGENT_ID, user, threadId: 'thread-1', resumeData: {} }),
			).rejects.toThrow('This action is no longer waiting for input');
			expect(provider.prepareTurn).not.toHaveBeenCalled();
		});

		it('refuses a checkpoint stored for another memory resource', async () => {
			const { service, provider, checkpointStorage } = setup();
			checkpointStorage.findSuspendedForThread.mockResolvedValue(
				suspendedCheckpoint('draft-chat:user-2') as never,
			);

			await expect(
				service.resume({ agentId: AGENT_ID, user, threadId: 'thread-1', resumeData: {} }),
			).rejects.toThrow(NotFoundError);
			expect(provider.prepareTurn).not.toHaveBeenCalled();
		});

		it('throws NotFoundError when the provider does not authorize the user', async () => {
			const { service, provider, checkpointStorage } = setup();
			provider.authorize.mockResolvedValue(false);
			checkpointStorage.findSuspendedForThread.mockResolvedValue(suspendedCheckpoint() as never);

			await expect(
				service.resume({ agentId: AGENT_ID, user, threadId: 'thread-1', resumeData: {} }),
			).rejects.toThrow(NotFoundError);
			expect(provider.prepareTurn).not.toHaveBeenCalled();
		});
	});

	describe('resumeRun', () => {
		it('normalizes the client resume data with the provider before it resumes', async () => {
			const { service, provider, checkpointStorage } = setup([textChunk]);
			checkpointStorage.load.mockResolvedValue({
				persistence: { threadId: 'thread-1' },
			} as never);
			checkpointStorage.findSuspendedForThread.mockResolvedValue(suspendedCheckpoint() as never);

			await service.resumeRun({
				agentId: AGENT_ID,
				user,
				runId: 'run-1',
				toolCallId: 'tc-1',
				resumeData: { kind: 'approval', approved: true },
				send: vi.fn(),
			});

			expect(checkpointStorage.load).toHaveBeenCalledWith('run-1', AGENT_ID);
			expect(provider.normalizeResumeData).toHaveBeenCalledWith({
				kind: 'approval',
				approved: true,
			});
			expect(provider.prepareTurn).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'resume',
					resumeData: { normalized: { kind: 'approval', approved: true } },
				}),
			);
		});

		it('refuses a run without a stored checkpoint', async () => {
			const { service, checkpointStorage } = setup();
			checkpointStorage.load.mockResolvedValue(undefined);

			await expect(
				service.resumeRun({
					agentId: AGENT_ID,
					user,
					runId: 'run-1',
					toolCallId: 'tc-1',
					resumeData: {},
					send: vi.fn(),
				}),
			).rejects.toThrow('This action is no longer waiting for input');
		});
	});

	describe('getStatus', () => {
		it('reports a thread with a queued message as running', async () => {
			const { service, executionRepository, checkpointStorage, messageQueue } = setup();
			executionRepository.existsRunningByThread.mockResolvedValue(false);
			checkpointStorage.findSuspendedForThread.mockResolvedValue(null);
			messageQueue.hasQueuedMessages.mockResolvedValue(true);

			expect((await service.getStatus(thread)).status).toBe('running');
		});

		it('keeps a suspended thread suspended while a message waits', async () => {
			const { service, executionRepository, checkpointStorage, messageQueue } = setup();
			executionRepository.existsRunningByThread.mockResolvedValue(false);
			checkpointStorage.findSuspendedForThread.mockResolvedValue(suspendedCheckpoint() as never);
			messageQueue.hasQueuedMessages.mockResolvedValue(true);

			expect((await service.getStatus(thread)).status).toBe('suspended');
		});

		it('reports an idle thread with an empty queue', async () => {
			const { service, executionRepository, checkpointStorage, messageQueue } = setup();
			executionRepository.existsRunningByThread.mockResolvedValue(false);
			checkpointStorage.findSuspendedForThread.mockResolvedValue(null);
			messageQueue.hasQueuedMessages.mockResolvedValue(false);

			expect((await service.getStatus(thread)).status).toBe('idle');
		});
	});

	describe('getUsage', () => {
		function usageRow(
			overrides: Partial<AgentExecutionUsageRow> & Pick<AgentExecutionUsageRow, 'id'>,
		): AgentExecutionUsageRow {
			return {
				threadId: thread.id,
				parentExecutionId: null,
				rootExecutionId: null,
				status: 'success',
				model: 'anthropic/claude-sonnet-4-5',
				startedAt: new Date('2026-10-08T10:00:00.000Z'),
				stoppedAt: new Date('2026-10-08T10:00:02.000Z'),
				duration: 2000,
				promptTokens: null,
				completionTokens: null,
				totalTokens: null,
				cacheReadTokens: null,
				cacheWriteTokens: null,
				cost: null,
				...overrides,
			};
		}

		it('returns each turn with its own usage, its descendants and their sum', async () => {
			const { service, executionRepository } = setup();
			executionRepository.findUsageByThreadId.mockResolvedValue([
				usageRow({
					id: 'turn-1',
					promptTokens: 1000,
					completionTokens: 40,
					totalTokens: 1040,
					cacheReadTokens: 800,
					cacheWriteTokens: 100,
					cost: 0.1,
				}),
				usageRow({ id: 'turn-2', promptTokens: 10, completionTokens: 1, totalTokens: 11 }),
			]);
			executionRepository.findDescendantUsageByRootIds.mockResolvedValue([
				usageRow({
					id: 'child-1',
					threadId: 'child-thread-1',
					parentExecutionId: 'turn-1',
					rootExecutionId: 'turn-1',
					promptTokens: 300,
					completionTokens: 30,
					totalTokens: 330,
					cacheReadTokens: 200,
					cost: 0.03,
				}),
				usageRow({
					id: 'grandchild-1',
					threadId: 'grandchild-thread-1',
					parentExecutionId: 'child-1',
					rootExecutionId: 'turn-1',
					promptTokens: 50,
					completionTokens: 5,
					totalTokens: 55,
					cost: 0.005,
				}),
			]);

			const usage = await service.getUsage(thread);

			expect(executionRepository.findUsageByThreadId).toHaveBeenCalledWith(thread.id);
			expect(executionRepository.findDescendantUsageByRootIds).toHaveBeenCalledWith([
				'turn-1',
				'turn-2',
			]);
			const [first, second] = usage.executions;
			expect(first).toMatchObject({
				executionId: 'turn-1',
				threadId: thread.id,
				parentExecutionId: null,
				startedAt: '2026-10-08T10:00:00.000Z',
				promptTokens: 1000,
				cacheReadTokens: 800,
				cacheWriteTokens: 100,
				cost: 0.1,
			});
			expect(
				first.descendants.map((entry) => [entry.executionId, entry.parentExecutionId]),
			).toEqual([
				['child-1', 'turn-1'],
				['grandchild-1', 'child-1'],
			]);
			expect(first.total).toEqual({
				promptTokens: 1350,
				completionTokens: 75,
				totalTokens: 1425,
				cacheReadTokens: 1000,
				cacheWriteTokens: 100,
				cost: expect.closeTo(0.135, 10),
			});
			expect(second.descendants).toEqual([]);
			expect(second.total).toEqual({
				promptTokens: 10,
				completionTokens: 1,
				totalTokens: 11,
				cacheReadTokens: null,
				cacheWriteTokens: null,
				cost: null,
			});
			expect(usage.total).toEqual({
				promptTokens: 1360,
				completionTokens: 76,
				totalTokens: 1436,
				cacheReadTokens: 1000,
				cacheWriteTokens: 100,
				cost: expect.closeTo(0.135, 10),
			});
		});
	});

	describe('access floor', () => {
		it('refuses a user who cannot read the working project, before the provider checks', async () => {
			const { service, provider } = setup();
			vi.mocked(userHasScopes).mockResolvedValue(false);

			await expect(service.assertCanUse(AGENT_ID, user, 'project-1')).rejects.toThrow(
				NotFoundError,
			);
			expect(userHasScopes).toHaveBeenCalledWith(user, ['project:read'], false, {
				projectId: 'project-1',
			});
			expect(provider.authorize).not.toHaveBeenCalled();
		});

		it('loads a usable thread with the floor on its working project', async () => {
			const { service, provider } = setup();

			expect(await service.getUsableThread(AGENT_ID, user, 'thread-1')).toBe(thread);
			expect(userHasScopes).toHaveBeenCalledWith(user, ['project:read'], false, {
				projectId: 'project-1',
			});
			expect(provider.authorize).toHaveBeenCalledWith(user, 'project-1');
		});

		it('refuses a thread the user does not own', async () => {
			const { service, threadRepository } = setup();
			threadRepository.findOwnedById.mockResolvedValue(null);

			await expect(service.getUsableThread(AGENT_ID, user, 'thread-1')).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	describe('prepareChatMessage', () => {
		it('keeps the working project of an existing session', async () => {
			const { service, threadRepository } = setup();
			threadRepository.findOwnedById.mockResolvedValue(thread);

			const input = await service.prepareChatMessage({
				agentId: AGENT_ID,
				user,
				sessionId: 'thread-1',
				message: 'hi',
			});

			expect(input).toMatchObject({
				projectId: 'project-1',
				threadId: 'thread-1',
				payload: { kind: 'system' },
			});
		});

		it('refuses a new session without a working project', async () => {
			const { service, threadRepository } = setup();
			threadRepository.findOwnedById.mockResolvedValue(null);

			await expect(
				service.prepareChatMessage({ agentId: AGENT_ID, user, message: 'hi' }),
			).rejects.toThrow('A new session needs a working project');
		});

		it('refuses a project that does not match the existing session', async () => {
			const { service, threadRepository } = setup();
			threadRepository.findOwnedById.mockResolvedValue(thread);

			await expect(
				service.prepareChatMessage({
					agentId: AGENT_ID,
					user,
					projectId: 'other-project',
					sessionId: 'thread-1',
					message: 'hi',
				}),
			).rejects.toThrow(NotFoundError);
		});
	});

	describe('workspace source', () => {
		it('gives a start turn no workspace when the provider has no source', async () => {
			const { service, provider } = setup([textChunk]);

			await service.consume(claimFor(), user, new AbortController().signal, vi.fn());

			expect(provider.prepareTurn.mock.calls[0][0]).not.toHaveProperty('workspace');
		});

		it('passes the lease to a start turn and releases it with the outcome', async () => {
			const { source, lease } = workspaceSource();
			const { service, provider } = setup([suspendedChunk], source);

			await service.consume(claimFor(), user, new AbortController().signal, vi.fn());

			expect(source.acquire).toHaveBeenCalledWith(workspaceScope);
			expect(provider.prepareTurn).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'start', workspace: lease }),
			);
			expect(source.release).toHaveBeenCalledTimes(1);
			expect(source.release).toHaveBeenCalledWith(workspaceScope, lease, {
				status: 'suspended',
				executionId: 'exec-1',
				error: undefined,
			});
		});

		it('acquires the lease before the turn is prepared', async () => {
			const { source } = workspaceSource();
			const { service, provider } = setup([textChunk], source);

			await service.consume(claimFor(), user, new AbortController().signal, vi.fn());

			expect(source.acquire.mock.invocationCallOrder[0]).toBeLessThan(
				provider.prepareTurn.mock.invocationCallOrder[0],
			);
		});

		it('passes a new lease to a resume turn and releases it with the outcome', async () => {
			const { source, lease } = workspaceSource();
			const { service, provider, checkpointStorage } = setup([textChunk], source);
			checkpointStorage.findSuspendedForThread.mockResolvedValue(suspendedCheckpoint() as never);

			const result = await service.resume({
				agentId: AGENT_ID,
				user,
				threadId: 'thread-1',
				resumeData: { approved: true },
			});
			await result.done;

			expect(source.acquire).toHaveBeenCalledWith(workspaceScope);
			expect(provider.prepareTurn).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'resume', workspace: lease }),
			);
			expect(source.release).toHaveBeenCalledWith(
				workspaceScope,
				lease,
				expect.objectContaining({ status: 'completed' }),
			);
		});

		it('runs the turn without a workspace and does not release when the source gives no lease', async () => {
			const { source } = workspaceSource();
			source.acquire.mockResolvedValue(undefined);
			const { service, provider, onSettled } = setup([textChunk], source);

			await service.consume(claimFor(), user, new AbortController().signal, vi.fn());

			expect(provider.prepareTurn.mock.calls[0][0]).not.toHaveProperty('workspace');
			expect(onSettled).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
			expect(source.release).not.toHaveBeenCalled();
		});

		it('keeps the turn result when the release fails', async () => {
			const { source } = workspaceSource();
			source.release.mockRejectedValue(new Error('sandbox gone'));
			const { service, onSettled, logger } = setup([textChunk], source);
			const send = vi.fn();

			await service.consume(claimFor(), user, new AbortController().signal, send);

			expect(onSettled).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
			expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'done' }));
			expect(logger.warn).toHaveBeenCalledWith(
				'System agent workspace release failed',
				expect.objectContaining({ threadId: 'thread-1' }),
			);
		});

		it('releases the lease as errored when the turn throws', async () => {
			const { source, lease } = workspaceSource();
			const { service, turnExecutionService } = setup([], source);
			const failure = new Error('stream broke');
			// eslint-disable-next-line require-yield
			turnExecutionService.execute.mockImplementation(async function* () {
				throw failure;
			});

			await expect(
				service.consume(claimFor(), user, new AbortController().signal, vi.fn()),
			).rejects.toThrow('stream broke');
			expect(source.release).toHaveBeenCalledWith(
				workspaceScope,
				lease,
				expect.objectContaining({ status: 'errored', error: failure }),
			);
		});

		it('releases the lease when the provider cannot prepare the turn', async () => {
			const { source, lease } = workspaceSource();
			const { service, provider, turnExecutionService } = setup([], source);
			const failure = new Error('no model');
			provider.prepareTurn.mockRejectedValue(failure);

			await expect(
				service.consume(claimFor(), user, new AbortController().signal, vi.fn()),
			).rejects.toThrow('no model');
			expect(source.release).toHaveBeenCalledWith(workspaceScope, lease, {
				status: 'errored',
				error: failure,
			});
			expect(turnExecutionService.execute).not.toHaveBeenCalled();
		});

		it('fails the turn before it is prepared when the acquisition fails', async () => {
			const { source } = workspaceSource();
			source.acquire.mockRejectedValue(new Error('no sandbox provider'));
			const { service, provider } = setup([], source);

			await expect(
				service.consume(claimFor(), user, new AbortController().signal, vi.fn()),
			).rejects.toThrow('no sandbox provider');
			expect(provider.prepareTurn).not.toHaveBeenCalled();
			expect(source.release).not.toHaveBeenCalled();
		});

		it('destroys the workspace of a deleted thread', async () => {
			const { source } = workspaceSource();
			const { service, executionService } = setup([], source);
			executionService.deleteThread.mockResolvedValue(true);

			await service.deleteThread(AGENT_ID, user, 'thread-1');

			expect(source.destroy).toHaveBeenCalledWith({
				agentId: AGENT_ID,
				threadId: 'thread-1',
				userId: 'user-1',
			});
			expect(executionService.deleteThread.mock.invocationCallOrder[0]).toBeLessThan(
				source.destroy.mock.invocationCallOrder[0],
			);
		});

		it('keeps a busy thread and its workspace', async () => {
			const { source } = workspaceSource();
			const { service, executionService } = setup([], source);
			executionService.deleteThread.mockRejectedValue(
				new ConflictError('The session has active work and cannot be deleted'),
			);

			await expect(service.deleteThread(AGENT_ID, user, 'thread-1')).rejects.toThrow(ConflictError);
			expect(source.destroy).not.toHaveBeenCalled();
		});

		it('does not destroy a workspace when the thread was not deleted', async () => {
			const { source } = workspaceSource();
			const { service, executionService } = setup([], source);
			executionService.deleteThread.mockResolvedValue(false);

			await expect(service.deleteThread(AGENT_ID, user, 'thread-1')).rejects.toThrow(NotFoundError);
			expect(source.destroy).not.toHaveBeenCalled();
		});

		it('keeps a thread deletion when the destroy fails', async () => {
			const { source } = workspaceSource();
			source.destroy.mockRejectedValue(new Error('sandbox api down'));
			const { service, executionService, logger } = setup([], source);
			executionService.deleteThread.mockResolvedValue(true);

			await expect(service.deleteThread(AGENT_ID, user, 'thread-1')).resolves.toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				'System agent workspace destroy failed',
				expect.objectContaining({ threadId: 'thread-1' }),
			);
		});

		it('destroys a workspace for a host that deletes the thread on its own path', async () => {
			const { source } = workspaceSource();
			const { service } = setup([], source);

			await service.destroyThreadWorkspace(AGENT_ID, 'thread-2');

			expect(source.destroy).toHaveBeenCalledWith({ agentId: AGENT_ID, threadId: 'thread-2' });
		});

		it('does nothing for an agent id without a registered provider', async () => {
			const { source } = workspaceSource();
			const { service } = setup([], source);

			await expect(
				service.destroyThreadWorkspace('unknown-agent', 'thread-1', 'user-1'),
			).resolves.toBeUndefined();
			expect(source.destroy).not.toHaveBeenCalled();
		});
	});

	describe('assertCanUse', () => {
		it('throws NotFoundError for an agent id without a registered provider', async () => {
			const { service } = setup();

			await expect(service.assertCanUse('unknown-agent', user, 'project-1')).rejects.toThrow(
				NotFoundError,
			);
		});
	});
	describe('register', () => {
		it('seeds the instance agent row before it registers the provider', async () => {
			const { service, agentRepository, registry } = setup();
			const provider = {
				agentId: 'other-agent',
				name: 'Other Agent',
				authorize: vi.fn(async () => true),
				prepareTurn: vi.fn(),
			} satisfies SystemAgentProvider;

			await service.register(provider);

			expect(agentRepository.ensureInstanceAgent).toHaveBeenCalledWith(
				'other-agent',
				'Other Agent',
			);
			expect(registry.get('other-agent')).toBe(provider);
		});

		it('does not register a provider whose agent row cannot be seeded', async () => {
			const { service, agentRepository, registry } = setup();
			agentRepository.ensureInstanceAgent.mockRejectedValue(new Error('project agent'));

			await expect(
				service.register({
					agentId: 'other-agent',
					name: 'Other Agent',
					authorize: vi.fn(async () => true),
					prepareTurn: vi.fn(),
				}),
			).rejects.toThrow('project agent');
			expect(registry.has('other-agent')).toBe(false);
		});
	});

	describe('hidden turns', () => {
		it('runs a hidden queued message like any other system turn', async () => {
			const { service, provider, prepared } = setup([textChunk]);
			const claim = claimFor({ followUp: true });
			claim.payload = {
				kind: 'system',
				message: 'Build me a workflow',
				resourceId: 'draft-chat:user-1',
				options: { followUp: true },
				hidden: true,
			};

			await service.consume(claim, user, new AbortController().signal, vi.fn());

			expect(provider.prepareTurn).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'start', options: { followUp: true } }),
			);
			expect(prepared[0]).toMatchObject({ type: 'start', input: 'model input' });
		});
	});

	describe('steerIntoRunningTurn', () => {
		it('steers a queued system message into the running turn', async () => {
			const { service, executionRepository, messageQueue } = setup();
			executionRepository.findSteerable.mockResolvedValue({ id: 'exec-1' } as never);

			expect(await service.steerIntoRunningTurn(thread, user, '7')).toBe(true);
			expect(messageQueue.steer).toHaveBeenCalledWith({
				projectId: 'project-1',
				agentId: AGENT_ID,
				threadId: 'thread-1',
				userId: 'user-1',
				queueId: '7',
				executionId: 'exec-1',
				kind: 'system',
			});
		});

		it('leaves the message queued when no turn accepts steering', async () => {
			const { service, executionRepository, messageQueue } = setup();
			executionRepository.findSteerable.mockResolvedValue(null);

			expect(await service.steerIntoRunningTurn(thread, user, '7')).toBe(false);
			expect(messageQueue.steer).not.toHaveBeenCalled();
		});

		it('leaves the message queued when the queue refuses the steer', async () => {
			const { service, executionRepository, messageQueue } = setup();
			executionRepository.findSteerable.mockResolvedValue({ id: 'exec-1' } as never);
			messageQueue.steer.mockRejectedValue(new Error('This message is no longer available'));

			expect(await service.steerIntoRunningTurn(thread, user, '7')).toBe(false);
		});
	});

	describe('cancel', () => {
		it('requests a cancel of the latest execution of an owned thread', async () => {
			const { service, executionRepository, chatExecutionService } = setup();
			executionRepository.findLatestByThreadId.mockResolvedValue({ id: 'exec-2' } as never);
			chatExecutionService.requestCancel.mockResolvedValue(true);

			expect(await service.cancel(AGENT_ID, user, 'thread-1')).toBe(true);
			expect(chatExecutionService.requestCancel).toHaveBeenCalledWith({
				projectId: 'project-1',
				agentId: AGENT_ID,
				threadId: 'thread-1',
				executionId: 'exec-2',
				userId: 'user-1',
				surface: 'preview',
			});
		});

		it('returns false for a thread without executions', async () => {
			const { service, executionRepository, chatExecutionService } = setup();
			executionRepository.findLatestByThreadId.mockResolvedValue(null);

			expect(await service.cancel(AGENT_ID, user, 'thread-1')).toBe(false);
			expect(chatExecutionService.requestCancel).not.toHaveBeenCalled();
		});

		it('refuses a thread the user does not own', async () => {
			const { service, threadRepository, chatExecutionService } = setup();
			threadRepository.findOwnedById.mockResolvedValue(null);

			await expect(service.cancel(AGENT_ID, user, 'thread-1')).rejects.toThrow(NotFoundError);
			expect(chatExecutionService.requestCancel).not.toHaveBeenCalled();
		});
	});

	describe('threads', () => {
		it('deletes an owned thread through the Agents execution service', async () => {
			const { service, executionService } = setup();
			executionService.deleteThread.mockResolvedValue(true);

			await service.deleteThread(AGENT_ID, user, 'thread-1');

			expect(executionService.deleteThread).toHaveBeenCalledWith(
				'project-1',
				AGENT_ID,
				'thread-1',
				'user-1',
			);
		});

		it('deletes the child sessions of a deleted thread after the thread', async () => {
			const { service, executionService, threadRepository } = setup();
			executionService.deleteThread.mockResolvedValue(true);
			threadRepository.findChildSessions.mockResolvedValue([
				{ id: 'ia-builder:thread-1:agent-a', agentId: 'agent-a', projectId: 'project-1' },
				{ id: 'ia-builder:thread-1:agent-b', agentId: 'agent-b', projectId: 'project-2' },
			]);

			await service.deleteThread(AGENT_ID, user, 'thread-1');

			expect(threadRepository.findChildSessions).toHaveBeenCalledWith('thread-1', AGENT_ID);
			expect(executionService.deleteThread.mock.calls).toEqual([
				['project-1', AGENT_ID, 'thread-1', 'user-1'],
				['project-1', 'agent-a', 'ia-builder:thread-1:agent-a', 'user-1'],
				['project-2', 'agent-b', 'ia-builder:thread-1:agent-b', 'user-1'],
			]);
		});

		it('keeps the child sessions of a busy thread', async () => {
			const { service, executionService, threadRepository } = setup();
			executionService.deleteThread.mockRejectedValue(
				new ConflictError('The session has active work and cannot be deleted'),
			);

			await expect(service.deleteThread(AGENT_ID, user, 'thread-1')).rejects.toThrow(ConflictError);
			expect(threadRepository.findChildSessions).not.toHaveBeenCalled();
		});

		it('logs a child session that cannot be deleted and deletes the others', async () => {
			const { service, executionService, threadRepository, logger } = setup();
			executionService.deleteThread
				.mockResolvedValueOnce(true)
				.mockRejectedValueOnce(new ConflictError('busy'))
				.mockResolvedValueOnce(true);
			threadRepository.findChildSessions.mockResolvedValue([
				{ id: 'child-1', agentId: 'agent-a', projectId: 'project-1' },
				{ id: 'child-2', agentId: 'agent-b', projectId: 'project-1' },
			]);

			await expect(service.deleteThread(AGENT_ID, user, 'thread-1')).resolves.toBeUndefined();
			expect(executionService.deleteThread).toHaveBeenCalledTimes(3);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to delete a child session of a system agent thread',
				expect.objectContaining({ threadId: 'thread-1', childThreadId: 'child-1' }),
			);
		});

		it('refuses to move a thread into a project the user cannot use', async () => {
			const { service, provider, threadRepository } = setup();
			provider.authorize.mockImplementation(
				async (_user: User, projectId: string) => projectId === 'project-1',
			);

			await expect(
				service.updateThread(AGENT_ID, user, 'thread-1', { projectId: 'project-2' }),
			).rejects.toThrow(NotFoundError);
			expect(threadRepository.updateOwned).not.toHaveBeenCalled();
		});

		it('refuses to create a session with the id of a thread of another user', async () => {
			const { service, threadRepository, txRunner } = setup();
			threadRepository.findOneBy.mockResolvedValue({ ...thread, ownerId: 'user-2' } as never);

			await expect(
				service.createThread({
					agentId: AGENT_ID,
					user,
					projectId: 'project-1',
					threadId: 'thread-1',
				}),
			).rejects.toThrow(NotFoundError);
			expect(txRunner.run).not.toHaveBeenCalled();
		});

		it('refuses to create a session with the id of a child session of the user', async () => {
			const { service, threadRepository, txRunner } = setup();
			threadRepository.findOneBy.mockResolvedValue({
				...thread,
				id: 'ia-builder:thread-1:agent-a',
				parentThreadId: 'thread-1',
			} as never);

			await expect(
				service.createThread({
					agentId: AGENT_ID,
					user,
					projectId: 'project-1',
					threadId: 'ia-builder:thread-1:agent-a',
				}),
			).rejects.toThrow(NotFoundError);
			expect(txRunner.run).not.toHaveBeenCalled();
		});

		it('returns an existing top-level session of the user', async () => {
			const { service, threadRepository, txRunner } = setup();
			threadRepository.findOneBy.mockResolvedValue(thread);

			await expect(
				service.createThread({
					agentId: AGENT_ID,
					user,
					projectId: 'project-1',
					threadId: 'thread-1',
				}),
			).resolves.toBe(thread);
			expect(txRunner.run).not.toHaveBeenCalled();
		});
	});
});
