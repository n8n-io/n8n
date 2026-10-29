import { AsyncLocalStorage } from 'node:async_hooks';

import type { AgentSseEvent } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { TransactionRunner, User } from '@n8n/db';
import { ConflictError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';
import { FileNotFoundError } from 'n8n-core';
import { Readable } from 'node:stream';
import { UserError } from 'n8n-workflow';

import { userHasScopes } from '@/permissions.ee/check-access';

import type { AgentChatAttachmentService } from '../../agent-chat-attachment.service';
import type { AgentChatExecutionService } from '../../agent-chat-execution.service';
import { AgentConversationStateService } from '../../agent-conversation-state.service';
import { AgentFormattedTurnError } from '../../agent-formatted-turn.error';
import type { AgentExecutionService } from '../../agent-execution.service';
import { toChatErrorEvent } from '../../agent-sse-stream';
import { AgentTurnAlreadyRunningError } from '../../agent-turn-already-running.error';
import type {
	AgentMessageQueueService,
	ClaimedAgentMessage,
} from '../../agent-message-queue.service';
import type {
	AgentTurnExecutionService,
	AgentTurnRequest,
} from '../../agent-turn-execution.service';
import type { AgentExecutionThread } from '../../entities/agent-execution-thread.entity';
import { ExecutionRecorder, type TimelineEvent } from '../../execution-recorder';
import type { N8NCheckpointStorage } from '../../integrations/n8n-checkpoint-storage';
import type { N8nMemory, N8nMemoryImpl } from '../../integrations/n8n-memory';
import type { AgentThreadGrantRepository } from '../../repositories/agent-thread-grant.repository';
import type {
	AgentExecutionRepository,
	AgentExecutionUsageRow,
} from '../../repositories/agent-execution.repository';
import type { AgentExecutionThreadRepository } from '../../repositories/agent-execution-thread.repository';
import type { AgentExecutionStreamChunk } from '../../types/agent-steering';
import type { AgentTurnFinalizeOutcome, FormattedTurnError } from '../../types/agent-turn-outcome';
import { executionToMessagesDto } from '../../utils/execution-to-message-mapper';
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
// Frozen: the service changes the threads it returns, so each test gets a copy.
const thread = Object.freeze({
	id: 'thread-1',
	agentId: AGENT_ID,
	agentName: 'Test Assistant',
	projectId: 'project-1',
	accessScope: 'user',
	ownerId: 'user-1',
	parentThreadId: null,
} as AgentExecutionThread);

/** The checkpoint of a turn that waits for the answer to one tool call. */
function suspendedCheckpoint(resourceId = 'system-chat:user-1') {
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

/**
 * `outcome` is what the runtime reports through `onBeforeFinalize` after the
 * chunks. `null` means the turn has no execution record, so no report.
 */
function setup(
	chunks: AgentExecutionStreamChunk[] = [],
	outcome: Omit<AgentTurnFinalizeOutcome, 'executionId'> | null = { status: 'completed' },
	workspace?: SystemAgentWorkspaceSource<TestLease>,
) {
	const registry = new SystemAgentRegistry();
	const threadRepository = mock<AgentExecutionThreadRepository>();
	const executionRepository = mock<AgentExecutionRepository>();
	const turnExecutionService = mock<AgentTurnExecutionService>();
	const messageQueue = mock<AgentMessageQueueService>();
	const checkpointStorage = mock<N8NCheckpointStorage>();
	const executionService = mock<AgentExecutionService>();
	const chatExecutionService = mock<AgentChatExecutionService>();
	const attachmentService = mock<AgentChatAttachmentService>();
	const agentMemory = mock<N8nMemoryImpl>();
	const n8nMemory = mock<N8nMemory>();
	n8nMemory.getImplementation.mockReturnValue(agentMemory);
	const agentCheckpointStore = mock<ReturnType<N8NCheckpointStorage['getStorage']>>();
	checkpointStorage.getStorage.mockReturnValue(agentCheckpointStore);
	const threadGrants = mock<AgentThreadGrantRepository>();

	const onChunk = vi.fn();
	const onSettled = vi.fn(async () => {});
	const handle: SystemAgentTurnHandle = {
		agent: {
			name: 'runtime-agent',
			fileStore: vi.fn(),
			snapshot: { model: { provider: 'anthropic' } },
		} as unknown as SystemAgentTurnHandle['agent'],
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
		formatSetupError: vi.fn(
			async (_user: User, _error: unknown): Promise<FormattedTurnError | undefined> => undefined,
		),
		normalizeResumeData: vi.fn((data: unknown) => ({ normalized: data })),
		...(workspace ? { workspace } : {}),
	} satisfies SystemAgentProvider<TestLease>;
	registry.register(provider);

	threadRepository.findOwnedById.mockImplementation(async () => ({ ...thread }));
	executionRepository.findExecution.mockResolvedValue(null);
	// Collect the prepared request, then stream the scripted chunks.
	const prepared: AgentTurnRequest[] = [];
	turnExecutionService.execute.mockImplementation(async function* (config) {
		prepared.push(await config.prepare());
		yield* chunks;
		if (outcome) await config.onBeforeFinalize?.({ executionId: 'exec-1', ...outcome });
	});

	const txRunner = mock<TransactionRunner>();
	const logger = mock<Logger>();
	const service = new SystemAgentExecutionService(
		logger,
		registry,
		threadRepository,
		executionRepository,
		executionService,
		turnExecutionService,
		messageQueue,
		chatExecutionService,
		checkpointStorage,
		txRunner,
		attachmentService,
		// The real service, so the status tests check the real reads and precedence.
		new AgentConversationStateService(executionRepository, checkpointStorage),
		n8nMemory,
		threadGrants,
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
		registry,
		attachmentService,
		n8nMemory,
		agentMemory,
		agentCheckpointStore,
		threadGrants,
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
			resourceId: 'system-chat:user-1',
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
				source: 'system_chat',
				payload: {
					kind: 'system',
					userId: 'user-1',
					message: 'hello',
					resourceId: 'system-chat:user-1',
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

	describe('host events', () => {
		/**
		 * Run the turn with a real recorder, the way the Agents runtime records
		 * it. Like the runtime, call the finalize hook before the record is
		 * stored, and keep the stored timeline.
		 */
		function setupWithRecorder(chunks: AgentExecutionStreamChunk[] = [textChunk]) {
			const context = setup(chunks);
			const recorders: ExecutionRecorder[] = [];
			const stored: TimelineEvent[][] = [];
			context.turnExecutionService.execute.mockImplementation(async function* (config) {
				const recorder = new ExecutionRecorder();
				recorders.push(recorder);
				config.onRecorderCreated?.(recorder);
				context.prepared.push(await config.prepare());
				try {
					for (const chunk of chunks) {
						if (chunk.type !== 'message-steered') recorder.record(chunk);
						yield chunk;
					}
				} finally {
					await config.onBeforeFinalize?.({ executionId: 'exec-1', status: 'completed' });
					stored.push(structuredClone(recorder.getMessageRecord().timeline));
				}
			});
			return { ...context, recorders, stored };
		}

		function historyOf(timeline: TimelineEvent[]) {
			return executionToMessagesDto({
				id: 'exec-1',
				userMessage: 'Build me a workflow',
				author: null,
				timeline,
				attachments: null,
				status: 'success',
				error: null,
				createdAt: new Date(),
			} as Parameters<typeof executionToMessagesDto>[0]).find(({ role }) => role === 'assistant')
				?.content;
		}

		it('streams events from prepareTurn and from the turn, and records them in order', async () => {
			const { service, provider, handle, onChunk, recorders } = setupWithRecorder();
			provider.prepareTurn.mockImplementation(async (turn) => {
				turn.emitHostEvent('test.prepared', { step: 1 });
				onChunk.mockImplementation(() => turn.emitHostEvent('test.after-text', { step: 2 }));
				return handle;
			});
			const send = vi.fn();

			await service.consume(claimFor(), user, new AbortController().signal, send);

			const events = send.mock.calls.map(([event]: [AgentSseEvent]) => event);
			expect(events.map((event) => event.type)).toEqual([
				'host-event',
				'text-delta',
				'host-event',
				'done',
			]);
			expect(events[0]).toEqual({
				type: 'host-event',
				name: 'test.prepared',
				payload: { step: 1 },
			});
			expect(events[2]).toEqual({
				type: 'host-event',
				name: 'test.after-text',
				payload: { step: 2 },
			});

			const { timeline } = recorders[0].getMessageRecord();
			expect(timeline.map((event) => event.type)).toEqual(['host-event', 'text', 'host-event']);

			// The same events come back from history after a reload.
			expect(historyOf(timeline)).toEqual([
				{ type: 'host-event', name: 'test.prepared', payload: { step: 1 } },
				{ type: 'text', text: 'Hello' },
				{ type: 'host-event', name: 'test.after-text', payload: { step: 2 } },
			]);
		});

		it('streams events of a resume turn to the resume stream', async () => {
			const { service, provider, handle, checkpointStorage } = setupWithRecorder();
			checkpointStorage.findSuspendedForThread.mockResolvedValue(suspendedCheckpoint() as never);
			provider.prepareTurn.mockImplementation(async (turn) => {
				turn.emitHostEvent('test.resumed');
				return handle;
			});
			const send = vi.fn();

			const { done } = await service.resume({
				agentId: AGENT_ID,
				user,
				threadId: 'thread-1',
				resumeData: { approved: true },
				send,
			});
			await done;

			expect(send).toHaveBeenCalledWith({
				type: 'host-event',
				name: 'test.resumed',
				payload: null,
			});
		});

		it('replaces a keyed event in place, in the stream and in the record', async () => {
			const { service, provider, handle, onChunk, stored } = setupWithRecorder();
			provider.prepareTurn.mockImplementation(async (turn) => {
				turn.emitHostEvent('test.progress', { done: 0 }, { key: 'build' });
				onChunk.mockImplementation(() =>
					turn.emitHostEvent('test.progress', { done: 1 }, { key: 'build' }),
				);
				return handle;
			});
			const send = vi.fn();

			await service.consume(claimFor(), user, new AbortController().signal, send);

			const events = send.mock.calls.map(([event]: [AgentSseEvent]) => event);
			expect(events.filter((event) => event.type === 'host-event')).toEqual([
				{ type: 'host-event', name: 'test.progress', key: 'build', payload: { done: 0 } },
				{ type: 'host-event', name: 'test.progress', key: 'build', payload: { done: 1 } },
			]);
			expect(historyOf(stored[0])).toEqual([
				{ type: 'host-event', name: 'test.progress', key: 'build', payload: { done: 1 } },
				{ type: 'text', text: 'Hello' },
			]);
		});

		it('sends and stores an event from onSettled before done', async () => {
			const { service, provider, handle, onSettled, stored } = setupWithRecorder();
			let emit: SystemAgentTurn['emitHostEvent'] | undefined;
			provider.prepareTurn.mockImplementation(async (turn) => {
				emit = turn.emitHostEvent;
				return handle;
			});
			onSettled.mockImplementation(async () => emit?.('test.summary', { ok: true }));
			const send = vi.fn();

			await service.consume(claimFor(), user, new AbortController().signal, send);

			expect(onSettled).toHaveBeenCalledWith({ executionId: 'exec-1', status: 'completed' });
			const events = send.mock.calls.map(([event]: [AgentSseEvent]) => event);
			expect(events.map((event) => event.type)).toEqual(['text-delta', 'host-event', 'done']);
			expect(historyOf(stored[0])).toEqual([
				{ type: 'text', text: 'Hello' },
				{ type: 'host-event', name: 'test.summary', payload: { ok: true } },
			]);
		});

		it('calls onSettled once and uses its outcome for the workspace and done', async () => {
			const { source } = workspaceSource();
			const context = setup([textChunk], { status: 'cancelled' }, source);
			const send = vi.fn();

			await context.service.consume(claimFor(), user, new AbortController().signal, send);

			expect(context.onSettled).toHaveBeenCalledTimes(1);
			expect(source.release).toHaveBeenCalledWith(
				workspaceScope,
				expect.anything(),
				expect.objectContaining({ status: 'cancelled' }),
			);
			expect(send).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'done' }));
			expect(context.executionRepository.findExecution).not.toHaveBeenCalled();
		});

		it('drops an event that comes after onSettled returned', async () => {
			const { service, provider, handle, logger, stored } = setupWithRecorder();
			let emit: SystemAgentTurn['emitHostEvent'] | undefined;
			provider.prepareTurn.mockImplementation(async (turn) => {
				emit = turn.emitHostEvent;
				return handle;
			});
			const send = vi.fn();

			await service.consume(claimFor(), user, new AbortController().signal, send);
			emit?.('test.late');

			expect(send).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'host-event' }));
			expect(stored[0]).not.toContainEqual(expect.objectContaining({ type: 'host-event' }));
			expect(logger.debug).toHaveBeenCalledWith(
				expect.stringContaining('dropped'),
				expect.objectContaining({ name: 'test.late' }),
			);
		});

		it('drops an event from onSettled when the turn has no execution record', async () => {
			const { service, provider, handle, onSettled, logger } = setup([textChunk], null);
			let emit: SystemAgentTurn['emitHostEvent'] | undefined;
			provider.prepareTurn.mockImplementation(async (turn) => {
				emit = turn.emitHostEvent;
				return handle;
			});
			onSettled.mockImplementation(async () => emit?.('test.late'));
			const send = vi.fn();

			await service.consume(claimFor(), user, new AbortController().signal, send);

			expect(onSettled).toHaveBeenCalledTimes(1);
			expect(send).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'host-event' }));
			expect(logger.debug).toHaveBeenCalledWith(
				expect.stringContaining('dropped'),
				expect.objectContaining({ name: 'test.late' }),
			);
		});
	});

	describe('consume', () => {
		it('prepares the turn and runs the provider handle on the Agents runtime', async () => {
			const {
				service,
				provider,
				handle,
				turnExecutionService,
				prepared,
				n8nMemory,
				agentMemory,
				checkpointStorage,
				agentCheckpointStore,
			} = setup([textChunk]);
			const signal = new AbortController().signal;

			await service.consume(claimFor({ runId: 'run-1' }), user, signal, vi.fn());

			expect(provider.prepareTurn).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'start',
					user,
					thread,
					resourceId: 'system-chat:user-1',
					executionId: 'exec-1',
					message: 'Build me a workflow',
					attachments: [],
					options: { runId: 'run-1' },
					memory: agentMemory,
					checkpointStore: agentCheckpointStore,
				}),
			);
			expect(n8nMemory.getImplementation).toHaveBeenCalledWith(AGENT_ID);
			expect(checkpointStorage.getStorage).toHaveBeenCalledWith(AGENT_ID);
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
						resourceId: 'system-chat:user-1',
						hostMetadata: { turnOptions: { runId: 'host-run-1' } },
					},
				},
			});
		});

		it('forwards chunks to the handle and the client, and settles as completed', async () => {
			const { service, onChunk, onSettled } = setup([textChunk]);
			const send = vi.fn();

			await service.consume(claimFor(), user, new AbortController().signal, send);

			expect(onChunk).toHaveBeenCalledWith(textChunk);
			expect(send).toHaveBeenCalledWith(expect.objectContaining({ type: 'text-delta' }));
			expect(onSettled).toHaveBeenCalledTimes(1);
			expect(onSettled).toHaveBeenCalledWith({ status: 'completed', executionId: 'exec-1' });
			expect(send).toHaveBeenLastCalledWith({
				type: 'done',
				sessionId: 'thread-1',
				executionId: 'exec-1',
			});
		});

		it('settles as suspended after a tool suspends, without a done event', async () => {
			const { service, onSettled } = setup([suspendedChunk], { status: 'suspended' });
			const send = vi.fn();

			await service.consume(claimFor(), user, new AbortController().signal, send);

			expect(onSettled).toHaveBeenCalledWith(expect.objectContaining({ status: 'suspended' }));
			expect(send).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'done' }));
		});

		it('settles as errored with the error that the runtime reports', async () => {
			const failure = new Error('model failed');
			const { service, onSettled } = setup(
				[{ type: 'error', error: failure } as AgentExecutionStreamChunk],
				{ status: 'errored', error: failure },
			);
			const send = vi.fn();

			await service.consume(claimFor(), user, new AbortController().signal, send);

			expect(onSettled).toHaveBeenCalledWith({
				status: 'errored',
				executionId: 'exec-1',
				error: failure,
			});
			expect(send).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
			expect(send).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'done' }));
		});

		it('settles as cancelled when the runtime reports a cancelled turn, without a done event', async () => {
			const { service, onSettled, executionRepository } = setup([textChunk], {
				status: 'cancelled',
			});
			const send = vi.fn();

			await service.consume(claimFor(), user, new AbortController().signal, send);

			expect(onSettled).toHaveBeenCalledWith({ status: 'cancelled', executionId: 'exec-1' });
			expect(send).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'done' }));
			// The outcome comes from the runtime, not from a read of the stored execution.
			expect(executionRepository.findExecution).not.toHaveBeenCalled();
		});

		it('settles as cancelled when the turn stops before it has an execution record', async () => {
			const { service, onSettled, turnExecutionService } = setup([], null);
			// eslint-disable-next-line require-yield
			turnExecutionService.execute.mockImplementation(async function* (config) {
				config.chatController?.abort();
			});

			await service.consume(claimFor(), user, new AbortController().signal, vi.fn());

			expect(onSettled).toHaveBeenCalledTimes(1);
			expect(onSettled).toHaveBeenCalledWith({ status: 'cancelled', executionId: 'exec-1' });
		});

		it('settles as errored and rethrows when the turn throws', async () => {
			const { service, onSettled, turnExecutionService } = setup();
			const failure = new Error('stream broke');
			// eslint-disable-next-line require-yield
			turnExecutionService.execute.mockImplementation(async function* () {
				throw failure;
			});

			const send = vi.fn();

			await expect(
				service.consume(claimFor(), user, new AbortController().signal, send),
			).rejects.toThrow('stream broke');
			expect(onSettled).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'errored', error: failure }),
			);
			expect(send).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'done' }));
		});

		it('runs the whole turn inside the turn context of the handle', async () => {
			const { service, handle, turnExecutionService, onSettled } = setup([textChunk], {
				status: 'completed',
			});
			const storage = new AsyncLocalStorage<string>();
			const seen: Array<string | undefined> = [];
			const withTurnContext = vi.fn(async (run: () => Promise<unknown>) => {
				return await storage.run('turn-span', run);
			});
			handle.withTurnContext = async <T>(run: () => Promise<T>) =>
				(await withTurnContext(run)) as T;
			turnExecutionService.execute.mockImplementation(async function* (config) {
				seen.push(storage.getStore());
				await config.prepare();
				yield textChunk;
				await config.onBeforeFinalize?.({ executionId: 'exec-1', status: 'completed' });
			});
			onSettled.mockImplementation(async () => {
				seen.push(storage.getStore());
			});

			await service.consume(claimFor(), user, new AbortController().signal, vi.fn());

			expect(withTurnContext).toHaveBeenCalledTimes(1);
			expect(seen).toEqual(['turn-span', 'turn-span']);
		});

		it('settles as errored and rethrows when the turn throws through withTurnContext', async () => {
			const { service, handle, onSettled, turnExecutionService } = setup();
			handle.withTurnContext = async <T>(run: () => Promise<T>) => await run();
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

		it('gives the provider the session grants of the thread', async () => {
			const { service, provider, threadGrants } = setup([textChunk]);
			threadGrants.findKeys.mockResolvedValue(new Set(['tool:run']));

			await service.consume(claimFor(), user, new AbortController().signal, vi.fn());
			const turn = provider.prepareTurn.mock.calls[0][0];

			await expect(turn.sessionGrants.load()).resolves.toEqual(new Set(['tool:run']));
			await turn.sessionGrants.grant('tool:write');
			await turn.sessionGrants.revoke('tool:run');
			expect(threadGrants.findKeys).toHaveBeenCalledWith('thread-1');
			expect(threadGrants.grant).toHaveBeenCalledWith('thread-1', 'tool:write');
			expect(threadGrants.revoke).toHaveBeenCalledWith('thread-1', 'tool:run');
		});

		describe('attachment reads', () => {
			const ref = { id: 'att-1', fileName: 'notes.txt', mimeType: 'text/plain', sizeBytes: 5 };

			async function startTurnWithAttachment() {
				const context = setup([textChunk]);
				const claim = claimFor();
				Object.assign(claim.payload, { attachments: [ref] });
				await context.service.consume(claim, user, new AbortController().signal, vi.fn());
				const turn = context.provider.prepareTurn.mock.calls[0][0];
				if (turn.type !== 'start') throw new Error('expected a start turn');
				return { ...context, turn };
			}

			it('reads an attachment of the turn from the system chat of the thread owner', async () => {
				const { turn, attachmentService } = await startTurnWithAttachment();
				const attachment = { id: 'att-1', threadId: 'thread-1' };
				attachmentService.getForSystemAgent.mockResolvedValue(attachment as never);
				attachmentService.getStream.mockResolvedValue(Readable.from([Buffer.from('hello')]));

				const content = await turn.readAttachment(ref);

				expect(content?.toString()).toBe('hello');
				expect(attachmentService.getForSystemAgent).toHaveBeenCalledWith('att-1', {
					agentId: AGENT_ID,
					resourceId: 'system-chat:user-1',
					source: 'system_chat',
				});
			});

			it('does not read a file that is not an attachment of the turn', async () => {
				const { turn, attachmentService } = await startTurnWithAttachment();

				await expect(turn.readAttachment({ ...ref, id: 'att-other' })).resolves.toBeUndefined();
				expect(attachmentService.getForSystemAgent).not.toHaveBeenCalled();
			});

			it('does not read an attachment that belongs to another thread', async () => {
				const { turn, attachmentService } = await startTurnWithAttachment();
				attachmentService.getForSystemAgent.mockResolvedValue({
					id: 'att-1',
					threadId: 'thread-2',
				} as never);

				await expect(turn.readAttachment(ref)).resolves.toBeUndefined();
				expect(attachmentService.getStream).not.toHaveBeenCalled();
			});

			it('gives no content when the attachment bytes no longer exist', async () => {
				const { turn, attachmentService } = await startTurnWithAttachment();
				attachmentService.getForSystemAgent.mockResolvedValue({
					id: 'att-1',
					threadId: 'thread-1',
				} as never);
				attachmentService.getStream.mockRejectedValue(new FileNotFoundError('file-1'));

				await expect(turn.readAttachment(ref)).resolves.toBeUndefined();
			});

			it('rethrows other storage errors', async () => {
				const { turn, attachmentService } = await startTurnWithAttachment();
				attachmentService.getForSystemAgent.mockResolvedValue({
					id: 'att-1',
					threadId: 'thread-1',
				} as never);
				const error = new Error('storage unavailable');
				attachmentService.getStream.mockRejectedValue(error);

				await expect(turn.readAttachment(ref)).rejects.toBe(error);
			});
		});

		it('attaches the attachment store to a turn without attachments', async () => {
			const { service, handle, attachmentService } = setup([textChunk]);
			const store = mock<ReturnType<AgentChatAttachmentService['getFileStore']>>();
			attachmentService.getFileStore.mockReturnValue(store);

			await service.consume(claimFor(), user, new AbortController().signal, vi.fn());

			expect(attachmentService.getFileStore).toHaveBeenCalledWith(
				{ agentId: AGENT_ID, projectId: 'project-1' },
				'anthropic',
			);
			expect(handle.agent.fileStore).toHaveBeenCalledWith(store);
		});

		it('keeps the host persistence when the provider run options set one', async () => {
			const { service, handle, prepared } = setup([textChunk]);
			handle.runOptions = {
				persistence: { threadId: 'other-thread', resourceId: 'other-resource' },
			} as never;

			await service.consume(claimFor(), user, new AbortController().signal, vi.fn());

			expect(prepared[0].options).toMatchObject({
				persistence: { threadId: 'thread-1', resourceId: 'system-chat:user-1' },
			});
		});

		it("passes the handle's side-call usage callback to the turn", async () => {
			const { service, handle, prepared } = setup([textChunk]);
			handle.onSideCallUsage = vi.fn();

			await service.consume(claimFor(), user, new AbortController().signal, vi.fn());

			expect(prepared[0].options.onSideCallUsage).toBe(handle.onSideCallUsage);
		});

		it('aborts the provider setup when the claim stops during setup', async () => {
			const { service, provider, handle } = setup([textChunk]);
			const claim = new AbortController();
			let abortedInSetup: boolean | undefined;
			provider.prepareTurn.mockImplementation(async (turn: SystemAgentTurn) => {
				claim.abort();
				abortedInSetup = turn.abortSignal.aborted;
				return handle;
			});

			await service.consume(claimFor(), user, claim.signal, vi.fn());

			expect(abortedInSetup).toBe(true);
		});

		it('stops following the claim signal when setup ends', async () => {
			const { service, provider } = setup([textChunk]);
			const claim = new AbortController();

			await service.consume(claimFor(), user, claim.signal, vi.fn());
			claim.abort();

			// After setup, the runtime owns the link between the claim signal and the turn.
			const [turn] = provider.prepareTurn.mock.calls[0];
			expect(turn.abortSignal.aborted).toBe(false);
		});

		it('runs the turn under the controller of the provider turn signal', async () => {
			const { service, provider, turnExecutionService, prepared } = setup([textChunk]);
			const claimSignal = new AbortController().signal;

			await service.consume(claimFor(), user, claimSignal, vi.fn());

			const [config] = turnExecutionService.execute.mock.calls[0];
			const [turn] = provider.prepareTurn.mock.calls[0];
			expect(config.chatController?.signal).toBe(turn.abortSignal);
			// The claim signal is the request signal: it stops the turn only before admission.
			expect(prepared[0].options.abortSignal).toBe(claimSignal);
		});

		it('stops following the provider run signal after the turn settles', async () => {
			const { service, handle, turnExecutionService, prepared } = setup([textChunk]);
			const providerAbort = new AbortController();
			handle.runOptions = { abortSignal: providerAbort.signal };

			await service.consume(claimFor(), user, new AbortController().signal, vi.fn());
			providerAbort.abort();

			const [config] = turnExecutionService.execute.mock.calls[0];
			expect(config.chatController?.signal.aborted).toBe(false);
			expect(prepared[0].options.abortSignal).not.toBe(providerAbort.signal);
		});

		it('aborts the turn controller while the turn runs when the provider aborts', async () => {
			const { service, handle, turnExecutionService } = setup();
			const providerAbort = new AbortController();
			handle.runOptions = { abortSignal: providerAbort.signal };
			let abortedInTurn: boolean | undefined;
			turnExecutionService.execute.mockImplementation(async function* (config) {
				await config.prepare();
				providerAbort.abort();
				abortedInTurn = config.chatController?.signal.aborted;
				yield textChunk;
			});

			await service.consume(claimFor(), user, new AbortController().signal, vi.fn());

			expect(abortedInTurn).toBe(true);
		});

		it('does not prepare a turn when the claim is already aborted', async () => {
			const { service, provider } = setup();
			const controller = new AbortController();
			controller.abort();

			await expect(service.consume(claimFor(), user, controller.signal, vi.fn())).rejects.toThrow();
			expect(provider.prepareTurn).not.toHaveBeenCalled();
		});
	});

	describe('error formatting', () => {
		const failure = new Error('raw provider failure');
		const errorChunk = { type: 'error', error: failure } as AgentExecutionStreamChunk;
		const quotaError = { message: 'You ran out of credits.', code: 'quota_exhausted' };

		it('sends the raw error text when the handle has no formatter', async () => {
			const { service, turnExecutionService } = setup([errorChunk]);
			const send = vi.fn();

			await service.consume(claimFor(), user, new AbortController().signal, send);

			expect(send).toHaveBeenCalledWith({ type: 'error', message: 'raw provider failure' });
			const [config] = turnExecutionService.execute.mock.calls[0];
			await expect(config.formatError?.(failure)).resolves.toBeUndefined();
		});

		it('sends the formatted text and code, and keeps the raw error for the settle hook', async () => {
			const { service, handle, turnExecutionService, onSettled } = setup([errorChunk], {
				status: 'errored',
				error: failure,
			});
			handle.formatError = vi.fn(async () => quotaError);
			const send = vi.fn();

			await service.consume(claimFor(), user, new AbortController().signal, send);

			expect(handle.formatError).toHaveBeenCalledWith(failure);
			expect(send).toHaveBeenCalledWith({
				type: 'error',
				message: 'You ran out of credits.',
				errorCode: 'quota_exhausted',
			});
			expect(send).not.toHaveBeenCalledWith(
				expect.objectContaining({ message: 'raw provider failure' }),
			);
			const [config] = turnExecutionService.execute.mock.calls[0];
			await expect(config.formatError?.(failure)).resolves.toEqual(quotaError);
			expect(onSettled).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'errored', error: failure }),
			);
		});

		it('calls the hook once when the recorder and the live event format the same error', async () => {
			const { service, handle, turnExecutionService } = setup();
			handle.formatError = vi.fn(async () => quotaError);
			turnExecutionService.execute.mockImplementation(async function* (config) {
				// The turn service formats the error for the record before it yields the chunk.
				await config.formatError?.(failure);
				yield errorChunk;
			});

			await service.consume(claimFor(), user, new AbortController().signal, vi.fn());

			expect(handle.formatError).toHaveBeenCalledTimes(1);
		});

		it('sends no error code when the formatter gives only text', async () => {
			const { service, handle } = setup([errorChunk]);
			handle.formatError = vi.fn(async () => ({ message: 'Something went wrong.' }));
			const send = vi.fn();

			await service.consume(claimFor(), user, new AbortController().signal, send);

			expect(send).toHaveBeenCalledWith({ type: 'error', message: 'Something went wrong.' });
		});

		it.each([
			['undefined', undefined],
			['an empty message', { message: '', code: 'quota_exhausted' }],
		])('keeps the raw error when the formatter returns %s', async (_name, formatted) => {
			const { service, handle } = setup([errorChunk]);
			handle.formatError = vi.fn(async () => formatted);
			const send = vi.fn();

			await service.consume(claimFor(), user, new AbortController().signal, send);

			expect(send).toHaveBeenCalledWith({ type: 'error', message: 'raw provider failure' });
		});

		it('keeps the raw error and logs when the formatter rejects', async () => {
			const { service, handle, logger, turnExecutionService } = setup([errorChunk]);
			handle.formatError = vi.fn(async () => {
				throw new Error('formatter broke');
			});
			const send = vi.fn();

			await service.consume(claimFor(), user, new AbortController().signal, send);

			expect(send).toHaveBeenCalledWith({ type: 'error', message: 'raw provider failure' });
			expect(logger.warn).toHaveBeenCalledWith(
				'System agent error formatter failed',
				expect.objectContaining({ threadId: 'thread-1' }),
			);
			const [config] = turnExecutionService.execute.mock.calls[0];
			await expect(config.formatError?.(failure)).resolves.toBeUndefined();
		});

		it('rethrows a thrown turn error with the formatted text, code and raw cause', async () => {
			const { service, handle, onSettled, turnExecutionService } = setup();
			handle.formatError = vi.fn(async () => quotaError);
			// eslint-disable-next-line require-yield
			turnExecutionService.execute.mockImplementation(async function* () {
				throw failure;
			});

			const consumed = service.consume(claimFor(), user, new AbortController().signal, vi.fn());

			await expect(consumed).rejects.toBeInstanceOf(AgentFormattedTurnError);
			await expect(consumed).rejects.toMatchObject({
				message: 'You ran out of credits.',
				errorCode: 'quota_exhausted',
				cause: failure,
			});
			const thrown: unknown = await consumed.catch((error: unknown) => error);
			// The queue consumer and the resume relay send the thrown error with this event.
			expect(toChatErrorEvent(thrown, 'Chat failed')).toEqual({
				type: 'error',
				message: 'You ran out of credits.',
				errorCode: 'quota_exhausted',
			});
			expect(onSettled).toHaveBeenCalledWith(
				expect.objectContaining({ status: 'errored', error: failure }),
			);
		});

		it('rethrows a thrown turn error as is when the handle has no formatter', async () => {
			const { service, turnExecutionService } = setup();
			// eslint-disable-next-line require-yield
			turnExecutionService.execute.mockImplementation(async function* () {
				throw failure;
			});

			await expect(
				service.consume(claimFor(), user, new AbortController().signal, vi.fn()),
			).rejects.toBe(failure);
		});

		it('does not format an error that already has a client error code', async () => {
			const { service, handle, turnExecutionService } = setup();
			handle.formatError = vi.fn(async () => quotaError);
			const running = new AgentTurnAlreadyRunningError();
			// eslint-disable-next-line require-yield
			turnExecutionService.execute.mockImplementation(async function* () {
				throw running;
			});

			await expect(
				service.consume(claimFor(), user, new AbortController().signal, vi.fn()),
			).rejects.toBe(running);
			expect(handle.formatError).not.toHaveBeenCalled();
			expect(toChatErrorEvent(running, 'Chat failed')).toMatchObject({
				errorCode: 'turn_already_running',
			});
		});

		it('formats an error that the turn setup threw', async () => {
			const { service, provider, turnExecutionService } = setup([]);
			const setupFailure = new Error('credits exhausted');
			provider.prepareTurn.mockRejectedValue(setupFailure);
			provider.formatSetupError.mockResolvedValue(quotaError);

			const error = await service
				.consume(claimFor(), user, new AbortController().signal, vi.fn())
				.catch((e: unknown) => e);

			expect(provider.formatSetupError).toHaveBeenCalledWith(user, setupFailure);
			expect(error).toBeInstanceOf(AgentFormattedTurnError);
			expect(error).toMatchObject({ message: quotaError.message, errorCode: 'quota_exhausted' });
			expect(toChatErrorEvent(error, 'Chat failed')).toEqual({
				type: 'error',
				message: quotaError.message,
				errorCode: 'quota_exhausted',
			});
			expect(turnExecutionService.execute).not.toHaveBeenCalled();
		});

		it('keeps the setup error of a stopped turn', async () => {
			const { service, provider } = setup([]);
			const claimController = new AbortController();
			const setupFailure = new Error('setup stopped');
			provider.prepareTurn.mockImplementation(async () => {
				claimController.abort();
				throw setupFailure;
			});
			provider.formatSetupError.mockResolvedValue(quotaError);

			await expect(service.consume(claimFor(), user, claimController.signal, vi.fn())).rejects.toBe(
				setupFailure,
			);
			expect(provider.formatSetupError).not.toHaveBeenCalled();
		});

		it('keeps a setup error that already has a client code', async () => {
			const { service, provider } = setup([]);
			const running = new AgentTurnAlreadyRunningError();
			provider.prepareTurn.mockRejectedValue(running);
			provider.formatSetupError.mockResolvedValue(quotaError);

			await expect(
				service.consume(claimFor(), user, new AbortController().signal, vi.fn()),
			).rejects.toBe(running);
			expect(provider.formatSetupError).not.toHaveBeenCalled();
		});

		it('keeps the raw setup error when the setup formatter fails', async () => {
			const { service, provider } = setup([]);
			const setupFailure = new Error('no model');
			provider.prepareTurn.mockRejectedValue(setupFailure);
			provider.formatSetupError.mockRejectedValue(new Error('formatter broke'));

			await expect(
				service.consume(claimFor(), user, new AbortController().signal, vi.fn()),
			).rejects.toBe(setupFailure);
		});

		it('formats the errors of a resumed turn', async () => {
			const { service, handle, checkpointStorage } = setup([errorChunk]);
			checkpointStorage.findSuspendedForThread.mockResolvedValue(suspendedCheckpoint() as never);
			handle.formatError = vi.fn(async () => quotaError);
			const send = vi.fn();

			const { done } = await service.resume({
				agentId: AGENT_ID,
				user,
				threadId: 'thread-1',
				resumeData: { approved: true },
				send,
			});
			await done;

			expect(send).toHaveBeenCalledWith({
				type: 'error',
				message: 'You ran out of credits.',
				errorCode: 'quota_exhausted',
			});
		});
	});

	describe('resume', () => {
		it('finds the suspended tool call in the checkpoint and prepares a resume turn', async () => {
			const { service, provider, checkpointStorage, prepared, agentMemory, agentCheckpointStore } =
				setup([textChunk]);
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
					resourceId: 'system-chat:user-1',
					runId: 'run-1',
					toolCallId: 'tc-1',
					checkpointHostMetadata: { turnOptions: { runId: 'host-run-1' } },
					resumeData: { approved: true },
					memory: agentMemory,
					checkpointStore: agentCheckpointStore,
				}),
			);
			expect(prepared[0]).toMatchObject({
				type: 'resume',
				resumeData: { approved: true },
				options: { runId: 'run-1', toolCallId: 'tc-1' },
			});
		});

		it('attaches the attachment store to a resumed turn', async () => {
			const { service, handle, checkpointStorage } = setup([textChunk]);
			checkpointStorage.findSuspendedForThread.mockResolvedValue(suspendedCheckpoint() as never);

			const result = await service.resume({
				agentId: AGENT_ID,
				user,
				threadId: 'thread-1',
				resumeData: { approved: true },
			});
			await result.done;

			expect(handle.agent.fileStore).toHaveBeenCalled();
		});

		it('logs a failed background resume instead of rejecting', async () => {
			const { service, logger, checkpointStorage, turnExecutionService } = setup();
			checkpointStorage.findSuspendedForThread.mockResolvedValue(suspendedCheckpoint() as never);
			const failure = new Error('resume broke');
			// eslint-disable-next-line require-yield
			turnExecutionService.execute.mockImplementation(async function* () {
				throw failure;
			});

			const result = await service.resume({
				agentId: AGENT_ID,
				user,
				threadId: 'thread-1',
				resumeData: { approved: true },
			});

			await expect(result.done).resolves.toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith('System agent resume failed', {
				threadId: 'thread-1',
				error: failure,
			});
		});

		it('runs the resumed turn under the controller of the provider turn signal', async () => {
			const { service, provider, checkpointStorage, turnExecutionService, prepared } = setup([
				textChunk,
			]);
			checkpointStorage.findSuspendedForThread.mockResolvedValue(suspendedCheckpoint() as never);

			const result = await service.resume({
				agentId: AGENT_ID,
				user,
				threadId: 'thread-1',
				resumeData: { approved: true },
			});
			await result.done;

			const [config] = turnExecutionService.execute.mock.calls[0];
			const [turn] = provider.prepareTurn.mock.calls[0];
			expect(config.chatController?.signal).toBe(turn.abortSignal);
			expect(prepared[0].options.abortSignal).toBeUndefined();
		});

		it('refuses a run id that does not match the open suspension', async () => {
			const { service, provider, checkpointStorage } = setup();
			checkpointStorage.findSuspendedForThread.mockResolvedValue(suspendedCheckpoint() as never);

			await expect(
				service.resume({
					agentId: AGENT_ID,
					user,
					threadId: 'thread-1',
					runId: 'run-old',
					resumeData: {},
				}),
			).rejects.toThrow('This action is no longer waiting for input');
			expect(provider.prepareTurn).not.toHaveBeenCalled();
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
				suspendedCheckpoint('system-chat:user-2') as never,
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

		it('reports the admitted execution and does not tie the resumed turn to the request', async () => {
			const { service, checkpointStorage, turnExecutionService, prepared } = setup([textChunk]);
			checkpointStorage.load.mockResolvedValue({
				persistence: { threadId: 'thread-1' },
			} as never);
			checkpointStorage.findSuspendedForThread.mockResolvedValue(suspendedCheckpoint() as never);
			turnExecutionService.execute.mockImplementation(async function* (config) {
				prepared.push(await config.prepare());
				config.onExecutionStarted?.('exec-resume', 'thread-1', []);
				yield textChunk;
				await config.onBeforeFinalize?.({ executionId: 'exec-resume', status: 'completed' });
			});
			const onExecutionStarted = vi.fn();
			const send = vi.fn();

			await service.resumeRun({
				agentId: AGENT_ID,
				user,
				runId: 'run-1',
				toolCallId: 'tc-1',
				resumeData: {},
				send,
				onExecutionStarted,
			});

			expect(onExecutionStarted).toHaveBeenCalledWith('exec-resume', 'thread-1', []);
			// Only an explicit Stop ends the turn, not a closed connection.
			expect(prepared[0].options.abortSignal).toBeUndefined();
			expect(send).toHaveBeenLastCalledWith({
				type: 'done',
				sessionId: 'thread-1',
				executionId: 'exec-resume',
			});
		});

		it("passes the handle's side-call usage callback to the resumed turn", async () => {
			const { service, handle, checkpointStorage, prepared } = setup([textChunk]);
			handle.onSideCallUsage = vi.fn();
			checkpointStorage.load.mockResolvedValue({
				persistence: { threadId: 'thread-1' },
			} as never);
			checkpointStorage.findSuspendedForThread.mockResolvedValue(suspendedCheckpoint() as never);

			await service.resumeRun({
				agentId: AGENT_ID,
				user,
				runId: 'run-1',
				toolCallId: 'tc-1',
				resumeData: {},
				send: vi.fn(),
			});

			expect(prepared[0].type).toBe('resume');
			expect(prepared[0].options.onSideCallUsage).toBe(handle.onSideCallUsage);
		});

		it('rejects when the resumed turn fails, so the route can report it', async () => {
			const { service, checkpointStorage, turnExecutionService } = setup();
			checkpointStorage.load.mockResolvedValue({
				persistence: { threadId: 'thread-1' },
			} as never);
			checkpointStorage.findSuspendedForThread.mockResolvedValue(suspendedCheckpoint() as never);
			// eslint-disable-next-line require-yield
			turnExecutionService.execute.mockImplementation(async function* () {
				throw new Error('resume broke');
			});
			const send = vi.fn();

			await expect(
				service.resumeRun({
					agentId: AGENT_ID,
					user,
					runId: 'run-1',
					toolCallId: 'tc-1',
					resumeData: {},
					send,
				}),
			).rejects.toThrow('resume broke');
			expect(send).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'done' }));
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

		it('returns each turn with its own usage, its delegated runs and their sum', async () => {
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
			executionRepository.findChildUsageByParentIds.mockResolvedValue([
				usageRow({
					id: 'child-1',
					threadId: 'child-thread-1',
					parentExecutionId: 'turn-1',
					promptTokens: 300,
					completionTokens: 30,
					totalTokens: 330,
					cacheReadTokens: 200,
					cost: 0.03,
				}),
				usageRow({
					id: 'child-2',
					threadId: 'child-thread-2',
					parentExecutionId: 'turn-1',
					promptTokens: 50,
					completionTokens: 5,
					totalTokens: 55,
					cost: 0.005,
				}),
			]);

			const usage = await service.getUsage(thread);

			expect(executionRepository.findUsageByThreadId).toHaveBeenCalledWith(thread.id);
			expect(executionRepository.findChildUsageByParentIds).toHaveBeenCalledWith([
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
				['child-2', 'turn-1'],
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

			expect(await service.getUsableThread(AGENT_ID, user, 'thread-1')).toEqual(thread);
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

		it('finds no thread for an id that the user has no thread with', async () => {
			const { service, threadRepository, provider } = setup();
			threadRepository.findOwnedById.mockResolvedValue(null);

			await expect(service.findUsableThread(AGENT_ID, user, 'new-thread')).resolves.toBeNull();
			expect(provider.authorize).not.toHaveBeenCalled();
		});

		it('still runs the floor when it finds a thread', async () => {
			const { service } = setup();
			vi.mocked(userHasScopes).mockResolvedValue(false);

			await expect(service.findUsableThread(AGENT_ID, user, 'thread-1')).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	describe('listThreads', () => {
		it("reads a page of the user's sessions with the agent", async () => {
			const { service, threadRepository } = setup();
			const page = { threads: [thread], hasMore: true };
			threadRepository.findOwnedHistoryPage.mockResolvedValue(page);
			const before = { updatedAt: new Date('2026-10-19T10:00:00.000Z'), id: 'thread-0' };

			await expect(
				service.listThreads(AGENT_ID, user, { limit: 5, search: 'digest', before }),
			).resolves.toBe(page);
			expect(threadRepository.findOwnedHistoryPage).toHaveBeenCalledWith(
				AGENT_ID,
				user.id,
				5,
				'digest',
				before,
			);
		});
	});

	describe('prepareChatMessage', () => {
		it('keeps the working project of an existing session', async () => {
			const { service } = setup();

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
			const { service } = setup();

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
			const { service, provider } = setup([suspendedChunk], { status: 'suspended' }, source);

			await service.consume(claimFor(), user, new AbortController().signal, vi.fn());

			expect(source.acquire).toHaveBeenCalledWith(workspaceScope);
			expect(provider.prepareTurn).toHaveBeenCalledWith(
				expect.objectContaining({ type: 'start', workspace: lease }),
			);
			expect(source.release).toHaveBeenCalledTimes(1);
			expect(source.release).toHaveBeenCalledWith(workspaceScope, lease, {
				status: 'suspended',
				executionId: 'exec-1',
			});
		});

		it('acquires the lease before the turn is prepared', async () => {
			const { source } = workspaceSource();
			const { service, provider } = setup([textChunk], undefined, source);

			await service.consume(claimFor(), user, new AbortController().signal, vi.fn());

			expect(source.acquire.mock.invocationCallOrder[0]).toBeLessThan(
				provider.prepareTurn.mock.invocationCallOrder[0],
			);
		});

		it('passes a new lease to a resume turn and releases it with the outcome', async () => {
			const { source, lease } = workspaceSource();
			const { service, provider, checkpointStorage } = setup([textChunk], undefined, source);
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
			const { service, provider, onSettled } = setup([textChunk], undefined, source);

			await service.consume(claimFor(), user, new AbortController().signal, vi.fn());

			expect(provider.prepareTurn.mock.calls[0][0]).not.toHaveProperty('workspace');
			expect(onSettled).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
			expect(source.release).not.toHaveBeenCalled();
		});

		it('keeps the turn result when the release fails', async () => {
			const { source } = workspaceSource();
			source.release.mockRejectedValue(new Error('sandbox gone'));
			const { service, onSettled, logger } = setup([textChunk], undefined, source);
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
			const { service, turnExecutionService } = setup([], undefined, source);
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
			const { service, provider, turnExecutionService } = setup([], undefined, source);
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

		it('stops the turn setup and releases the lease as cancelled after a stop during the acquisition', async () => {
			const { source, lease } = workspaceSource();
			const claimController = new AbortController();
			source.acquire.mockImplementation(async () => {
				claimController.abort();
				return lease;
			});
			const { service, provider, turnExecutionService } = setup([], undefined, source);
			const failure = new Error('setup stopped');
			provider.prepareTurn.mockImplementation(async (turn) => {
				expect(turn.abortSignal.aborted).toBe(true);
				throw failure;
			});

			await expect(
				service.consume(claimFor(), user, claimController.signal, vi.fn()),
			).rejects.toThrow('setup stopped');
			expect(provider.prepareTurn).toHaveBeenCalledTimes(1);
			expect(source.release).toHaveBeenCalledWith(workspaceScope, lease, {
				status: 'cancelled',
				error: failure,
			});
			expect(turnExecutionService.execute).not.toHaveBeenCalled();
		});

		it('fails the turn before it is prepared when the acquisition fails', async () => {
			const { source } = workspaceSource();
			source.acquire.mockRejectedValue(new Error('no sandbox provider'));
			const { service, provider } = setup([], undefined, source);

			await expect(
				service.consume(claimFor(), user, new AbortController().signal, vi.fn()),
			).rejects.toThrow('no sandbox provider');
			expect(provider.prepareTurn).not.toHaveBeenCalled();
			expect(source.release).not.toHaveBeenCalled();
		});

		it('destroys the workspace of a deleted thread', async () => {
			const { source } = workspaceSource();
			const { service, executionService } = setup([], undefined, source);
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
			const { service, executionService } = setup([], undefined, source);
			executionService.deleteThread.mockRejectedValue(
				new ConflictError('The session has active work and cannot be deleted'),
			);

			await expect(service.deleteThread(AGENT_ID, user, 'thread-1')).rejects.toThrow(ConflictError);
			expect(source.destroy).not.toHaveBeenCalled();
		});

		it('does not destroy a workspace when the thread was not deleted', async () => {
			const { source } = workspaceSource();
			const { service, executionService } = setup([], undefined, source);
			executionService.deleteThread.mockResolvedValue(false);

			await expect(service.deleteThread(AGENT_ID, user, 'thread-1')).rejects.toThrow(NotFoundError);
			expect(source.destroy).not.toHaveBeenCalled();
		});

		it('keeps a thread deletion when the destroy fails', async () => {
			const { source } = workspaceSource();
			source.destroy.mockRejectedValue(new Error('sandbox api down'));
			const { service, executionService, logger } = setup([], undefined, source);
			executionService.deleteThread.mockResolvedValue(true);

			await expect(service.deleteThread(AGENT_ID, user, 'thread-1')).resolves.toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				'System agent workspace destroy failed',
				expect.objectContaining({ threadId: 'thread-1' }),
			);
		});

		it('destroys a workspace for a host that deletes the thread on its own path', async () => {
			const { source } = workspaceSource();
			const { service } = setup([], undefined, source);

			await service.destroyThreadWorkspace(AGENT_ID, 'thread-2');

			expect(source.destroy).toHaveBeenCalledWith({ agentId: AGENT_ID, threadId: 'thread-2' });
		});

		it('does nothing for an agent id without a registered provider', async () => {
			const { source } = workspaceSource();
			const { service } = setup([], undefined, source);

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
	describe('hidden turns', () => {
		it('runs a hidden queued message like any other system turn', async () => {
			const { service, provider, prepared } = setup([textChunk]);
			const claim = claimFor({ followUp: true });
			claim.payload = {
				kind: 'system',
				message: 'Build me a workflow',
				resourceId: 'system-chat:user-1',
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
				surface: 'system',
			});
		});

		it('cancels a turn of a user who can no longer use the working project', async () => {
			const { service, provider, executionRepository, chatExecutionService } = setup();
			vi.mocked(userHasScopes).mockResolvedValue(false);
			provider.authorize.mockResolvedValue(false);
			executionRepository.findLatestByThreadId.mockResolvedValue({ id: 'exec-2' } as never);
			chatExecutionService.requestCancel.mockResolvedValue(true);

			expect(await service.cancel(AGENT_ID, user, 'thread-1')).toBe(true);
			expect(chatExecutionService.requestCancel).toHaveBeenCalled();
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

	describe('deleteThreadsOfUser', () => {
		const sessions = [
			{ id: 'thread-1', agentId: AGENT_ID, projectId: 'project-1' },
			{ id: 'thread-2', agentId: 'unregistered-agent', projectId: 'project-2' },
		];

		afterEach(() => {
			vi.useRealTimers();
		});

		const setupDeletion = (...args: Parameters<typeof setup>) => {
			const result = setup(...args);
			result.threadRepository.findByParentThreadId.mockResolvedValue([]);
			return result;
		};

		it('deletes every session with its workspace, also without a provider', async () => {
			const { source } = workspaceSource();
			const { service, executionService, executionRepository, threadRepository } = setupDeletion(
				[],
				undefined,
				source,
			);
			threadRepository.findOwnedSystemAgentSessions.mockResolvedValue(sessions);
			executionRepository.existsRunningByThread.mockResolvedValue(false);
			executionService.deleteThread.mockResolvedValue(true);

			await service.deleteThreadsOfUser('user-1');

			expect(threadRepository.findOwnedSystemAgentSessions).toHaveBeenCalledWith('user-1');
			// It does not load the thread through the ownership and provider checks.
			expect(threadRepository.findOwnedById).not.toHaveBeenCalled();
			expect(executionService.deleteThread.mock.calls).toEqual([
				['project-1', AGENT_ID, 'thread-1', 'user-1'],
				['project-2', 'unregistered-agent', 'thread-2', 'user-1'],
			]);
			expect(source.destroy).toHaveBeenCalledExactlyOnceWith({
				agentId: AGENT_ID,
				threadId: 'thread-1',
				userId: 'user-1',
			});
		});

		it('logs a session that fails and deletes the others', async () => {
			const { service, executionService, executionRepository, threadRepository, logger } =
				setupDeletion();
			threadRepository.findOwnedSystemAgentSessions.mockResolvedValue(sessions);
			executionRepository.existsRunningByThread.mockResolvedValue(false);
			executionService.deleteThread
				.mockRejectedValueOnce(new Error('db down'))
				.mockResolvedValueOnce(true);

			await expect(service.deleteThreadsOfUser('user-1')).resolves.toBeUndefined();

			expect(executionService.deleteThread).toHaveBeenCalledTimes(2);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to delete a system agent session of a deleted user',
				expect.objectContaining({ userId: 'user-1', threadId: 'thread-1', error: 'db down' }),
			);
		});

		it('logs a failed lookup and does not throw', async () => {
			const { service, executionService, threadRepository, logger } = setupDeletion();
			threadRepository.findOwnedSystemAgentSessions.mockRejectedValue(new Error('db down'));

			await expect(service.deleteThreadsOfUser('user-1')).resolves.toBeUndefined();

			expect(executionService.deleteThread).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to find the system agent sessions of a deleted user',
				expect.objectContaining({ userId: 'user-1' }),
			);
		});

		it('stops a running turn and deletes the session when the turn has ended', async () => {
			vi.useFakeTimers();
			const {
				service,
				executionService,
				executionRepository,
				threadRepository,
				chatExecutionService,
			} = setupDeletion();
			threadRepository.findOwnedSystemAgentSessions.mockResolvedValue([sessions[0]]);
			executionRepository.existsRunningByThread.mockResolvedValue(true);
			executionRepository.findLatestByThreadId.mockResolvedValue(mock({ id: 'exec-1' }));
			chatExecutionService.requestCancel.mockResolvedValue(true);
			executionService.deleteThread
				.mockRejectedValueOnce(new ConflictError('busy'))
				.mockResolvedValueOnce(true);

			const done = service.deleteThreadsOfUser('user-1');
			await vi.runAllTimersAsync();
			await done;

			expect(chatExecutionService.requestCancel).toHaveBeenCalledWith({
				projectId: 'project-1',
				agentId: AGENT_ID,
				threadId: 'thread-1',
				executionId: 'exec-1',
				userId: 'user-1',
				surface: 'system',
			});
			expect(chatExecutionService.requestCancel.mock.invocationCallOrder[0]).toBeLessThan(
				executionService.deleteThread.mock.invocationCallOrder[0],
			);
			expect(executionService.deleteThread).toHaveBeenCalledTimes(2);
		});

		it('deletes the child sessions of delegated runs before their parent', async () => {
			const { service, executionService, executionRepository, threadRepository } = setupDeletion();
			const root = sessions[0];
			threadRepository.findOwnedSystemAgentSessions.mockResolvedValue([root]);
			threadRepository.findByParentThreadId.mockImplementation(async (parentThreadId) => {
				const children: Record<string, string[]> = {
					'thread-1': ['child-1', 'child-2'],
					'child-1': ['grandchild-1'],
				};
				return (children[parentThreadId] ?? []).map((id) =>
					mock<AgentExecutionThread>({ id, agentId: 'sub-agent', projectId: root.projectId }),
				);
			});
			executionRepository.existsRunningByThread.mockResolvedValue(false);
			executionService.deleteThread.mockResolvedValue(true);

			await service.deleteThreadsOfUser('user-1');

			expect(threadRepository.findByParentThreadId).toHaveBeenCalledWith('thread-1', 'project-1');
			expect(executionService.deleteThread.mock.calls.map(([, , threadId]) => threadId)).toEqual([
				'grandchild-1',
				'child-2',
				'child-1',
				'thread-1',
			]);
		});

		it('stops the root turn when only a child session runs', async () => {
			const {
				service,
				executionService,
				executionRepository,
				threadRepository,
				chatExecutionService,
			} = setupDeletion();
			threadRepository.findOwnedSystemAgentSessions.mockResolvedValue([sessions[0]]);
			threadRepository.findByParentThreadId.mockImplementation(async (parentThreadId) =>
				parentThreadId === 'thread-1'
					? [
							mock<AgentExecutionThread>({
								id: 'child-1',
								agentId: 'sub-agent',
								projectId: 'project-1',
							}),
						]
					: [],
			);
			executionRepository.existsRunningByThread.mockImplementation(
				async (threadId) => threadId === 'child-1',
			);
			executionRepository.findLatestByThreadId.mockResolvedValue(mock({ id: 'exec-1' }));
			executionService.deleteThread.mockResolvedValue(true);

			await service.deleteThreadsOfUser('user-1');

			expect(chatExecutionService.requestCancel).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ threadId: 'thread-1', executionId: 'exec-1' }),
			);
			expect(executionService.deleteThread).toHaveBeenCalledTimes(2);
		});

		it('deletes the parent when a child session fails', async () => {
			const { service, executionService, executionRepository, threadRepository, logger } =
				setupDeletion();
			threadRepository.findOwnedSystemAgentSessions.mockResolvedValue([sessions[0]]);
			threadRepository.findByParentThreadId.mockImplementation(async (parentThreadId) =>
				parentThreadId === 'thread-1'
					? [
							mock<AgentExecutionThread>({
								id: 'child-1',
								agentId: 'sub-agent',
								projectId: 'project-1',
							}),
						]
					: [],
			);
			executionRepository.existsRunningByThread.mockResolvedValue(false);
			executionService.deleteThread
				.mockRejectedValueOnce(new Error('db down'))
				.mockResolvedValueOnce(true);

			await service.deleteThreadsOfUser('user-1');

			expect(executionService.deleteThread).toHaveBeenLastCalledWith(
				'project-1',
				AGENT_ID,
				'thread-1',
				'user-1',
			);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to delete a system agent session of a deleted user',
				expect.objectContaining({ threadId: 'child-1', error: 'db down' }),
			);
		});

		it('gives up on a session that stays busy and logs it', async () => {
			vi.useFakeTimers();
			const { service, executionService, executionRepository, threadRepository, logger } =
				setupDeletion();
			threadRepository.findOwnedSystemAgentSessions.mockResolvedValue([sessions[0]]);
			executionRepository.existsRunningByThread.mockResolvedValue(false);
			executionService.deleteThread.mockRejectedValue(new ConflictError('busy'));

			const done = service.deleteThreadsOfUser('user-1');
			await vi.runAllTimersAsync();
			await done;

			expect(executionService.deleteThread).toHaveBeenCalledTimes(5);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to delete a system agent session of a deleted user',
				expect.objectContaining({ threadId: 'thread-1', error: 'busy' }),
			);
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

		it('refuses to move a thread into a project the user cannot use', async () => {
			const { service, provider, threadRepository } = setup();
			provider.authorize.mockImplementation(
				async (_user: User, projectId: string) => projectId === 'project-1',
			);

			await expect(
				service.updateThread(AGENT_ID, user, 'thread-1', { projectId: 'project-2' }),
			).rejects.toThrow(NotFoundError);
			expect(threadRepository.moveOwned).not.toHaveBeenCalled();
		});

		it.each(['running', 'suspended', 'queued'] as const)(
			'refuses to move a thread with a %s turn, checked under the thread lock',
			async (state) => {
				const {
					service,
					threadRepository,
					txRunner,
					executionRepository,
					checkpointStorage,
					messageQueue,
				} = setup();
				const ctx = {};
				txRunner.run.mockImplementation(async (_ctx, fn) => await fn(ctx));
				threadRepository.lockById.mockResolvedValue({ ...thread });
				executionRepository.existsRunningByThread.mockResolvedValue(state === 'running');
				checkpointStorage.findSuspendedForThread.mockResolvedValue(
					state === 'suspended' ? (suspendedCheckpoint() as never) : null,
				);
				messageQueue.hasQueuedMessages.mockResolvedValue(state === 'queued');

				await expect(
					service.updateThread(AGENT_ID, user, 'thread-1', { projectId: 'project-2' }),
				).rejects.toThrow('Wait for the current turn to finish before you change the project');

				expect(threadRepository.lockById).toHaveBeenCalledWith('thread-1', ctx);
				// The status reads run in the same transaction as the lock.
				expect(executionRepository.existsRunningByThread).toHaveBeenCalledWith('thread-1', ctx);
				expect(threadRepository.moveOwned).not.toHaveBeenCalled();
			},
		);

		it('renames a thread without the lock and the status check', async () => {
			const { service, threadRepository, txRunner, executionRepository } = setup();
			txRunner.run.mockImplementation(async (_ctx, fn) => await fn({}));
			threadRepository.renameOwned.mockResolvedValue(true);

			await service.updateThread(AGENT_ID, user, 'thread-1', { title: 'Renamed' });

			expect(threadRepository.lockById).not.toHaveBeenCalled();
			expect(executionRepository.existsRunningByThread).not.toHaveBeenCalled();
		});

		it('renames and moves a thread in one transaction', async () => {
			const {
				service,
				threadRepository,
				txRunner,
				executionRepository,
				checkpointStorage,
				messageQueue,
			} = setup();
			const ctx = {};
			executionRepository.existsRunningByThread.mockResolvedValue(false);
			checkpointStorage.findSuspendedForThread.mockResolvedValue(null);
			messageQueue.hasQueuedMessages.mockResolvedValue(false);
			txRunner.run.mockImplementation(async (_ctx, fn) => await fn(ctx));
			threadRepository.lockById.mockResolvedValue({ ...thread });
			threadRepository.renameOwned.mockResolvedValue(true);
			threadRepository.moveOwned.mockResolvedValue(true);

			const updated = await service.updateThread(AGENT_ID, user, 'thread-1', {
				title: 'Renamed',
				projectId: 'project-2',
			});

			expect(threadRepository.lockById).toHaveBeenCalledWith('thread-1', ctx);
			expect(messageQueue.hasQueuedMessages).toHaveBeenCalledWith('thread-1', ctx);

			expect(threadRepository.renameOwned).toHaveBeenCalledWith(
				AGENT_ID,
				user.id,
				'thread-1',
				'Renamed',
				ctx,
			);
			expect(threadRepository.moveOwned).toHaveBeenCalledWith(
				AGENT_ID,
				user.id,
				'thread-1',
				'project-2',
				ctx,
			);
			expect(updated).toMatchObject({ title: 'Renamed', projectId: 'project-2' });
		});

		it('reports a thread that was deleted during the update as not found', async () => {
			const { service, threadRepository, txRunner } = setup();
			txRunner.run.mockImplementation(async (ctx, fn) => await fn(ctx));
			threadRepository.renameOwned.mockResolvedValue(false);

			await expect(
				service.updateThread(AGENT_ID, user, 'thread-1', { title: 'Renamed' }),
			).rejects.toThrow(NotFoundError);
		});

		it('creates a private session for a new thread id', async () => {
			const { service, threadRepository, txRunner } = setup();
			const ctx = {};
			threadRepository.findOwnedById.mockResolvedValue(null);
			txRunner.run.mockImplementation(async (_ctx, fn) => await fn(ctx));
			threadRepository.findOrCreate.mockResolvedValue({
				thread: { ...thread, id: 'thread-new' },
				created: true,
			} as never);
			threadRepository.renameOwned.mockResolvedValue(true);

			const created = await service.createThread({
				agentId: AGENT_ID,
				user,
				projectId: 'project-1',
				threadId: 'thread-new',
				title: 'First chat',
			});

			expect(threadRepository.findOrCreate).toHaveBeenCalledWith(
				'thread-new',
				AGENT_ID,
				'Test Assistant',
				'project-1',
				{ accessScope: 'user', ownerId: 'user-1' },
				ctx,
			);
			expect(threadRepository.renameOwned).toHaveBeenCalledWith(
				AGENT_ID,
				'user-1',
				'thread-new',
				'First chat',
				ctx,
			);
			expect(created).toMatchObject({ id: 'thread-new', title: 'First chat' });
		});

		it('queues the first message of a new session in the created thread', async () => {
			const { service, threadRepository, txRunner } = setup();
			threadRepository.findOwnedById.mockResolvedValue(null);
			txRunner.run.mockImplementation(async (_ctx, fn) => await fn({}));
			threadRepository.findOrCreate.mockResolvedValue({
				thread: { ...thread, id: 'thread-new' },
				created: true,
			} as never);

			const input = await service.prepareChatMessage({
				agentId: AGENT_ID,
				user,
				projectId: 'project-1',
				sessionId: 'thread-new',
				message: 'Hello',
			});

			expect(input).toMatchObject({
				agentId: AGENT_ID,
				projectId: 'project-1',
				threadId: 'thread-new',
				source: 'system_chat',
				payload: { kind: 'system', userId: 'user-1', message: 'Hello' },
			});
		});

		it('checks access and looks up the session once for the first message of a new session', async () => {
			const { service, provider, threadRepository, txRunner } = setup();
			threadRepository.findOwnedById.mockResolvedValue(null);
			txRunner.run.mockImplementation(async (_ctx, fn) => await fn({}));
			threadRepository.findOrCreate.mockResolvedValue({
				thread: { ...thread, id: 'thread-new' },
				created: true,
			} as never);
			const chatTurnOptions = vi.fn(async () => ({ mode: 'build' }));
			Object.assign(provider, { chatTurnOptions });

			const input = await service.prepareChatMessage({
				agentId: AGENT_ID,
				user,
				projectId: 'project-1',
				sessionId: 'thread-new',
				message: 'Hello',
			});

			expect(provider.authorize).toHaveBeenCalledTimes(1);
			expect(userHasScopes).toHaveBeenCalledTimes(1);
			expect(threadRepository.findOwnedById).toHaveBeenCalledTimes(1);
			// The provider from the same lookup builds the turn options for the new thread.
			expect(chatTurnOptions).toHaveBeenCalledWith(
				user,
				expect.objectContaining({ id: 'thread-new' }),
				undefined,
			);
			expect(input.payload).toMatchObject({ options: { mode: 'build' } });
		});

		it('queues a message of an existing session without a transaction', async () => {
			const { service, provider, txRunner } = setup();

			const input = await service.prepareChatMessage({
				agentId: AGENT_ID,
				user,
				sessionId: 'thread-1',
				message: 'Hello',
			});

			expect(input).toMatchObject({ projectId: 'project-1', threadId: 'thread-1' });
			expect(provider.authorize).toHaveBeenCalledTimes(1);
			expect(txRunner.run).not.toHaveBeenCalled();
		});

		it('refuses to return an existing session of the user from another project', async () => {
			const { service, threadRepository, txRunner } = setup();
			threadRepository.findOwnedById.mockResolvedValue({ ...thread, projectId: 'project-2' });

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

		it('returns an existing session of the user in the same project', async () => {
			const { service, threadRepository, txRunner } = setup();
			const existing = { ...thread, projectId: 'project-1' };
			threadRepository.findOwnedById.mockResolvedValue(existing);

			expect(
				await service.createThread({
					agentId: AGENT_ID,
					user,
					projectId: 'project-1',
					threadId: 'thread-1',
				}),
			).toBe(existing);
			expect(txRunner.run).not.toHaveBeenCalled();
		});

		it('looks up an existing session among the top-level sessions of the user', async () => {
			const { service, threadRepository } = setup();

			await service.createThread({
				agentId: AGENT_ID,
				user,
				projectId: 'project-1',
				threadId: 'thread-1',
			});

			expect(threadRepository.findOwnedById).toHaveBeenCalledWith(AGENT_ID, 'user-1', 'thread-1');
		});

		it('refuses to create a session with the id of a thread of another user', async () => {
			const { service, threadRepository, txRunner } = setup();
			threadRepository.findOwnedById.mockResolvedValue(null);
			txRunner.run.mockImplementation(async (_ctx, fn) => await fn({}));
			threadRepository.findOrCreate.mockRejectedValue(new UserError('Session not found'));

			await expect(
				service.createThread({
					agentId: AGENT_ID,
					user,
					projectId: 'project-1',
					threadId: 'thread-1',
				}),
			).rejects.toThrow(NotFoundError);
		});

		it('refuses to return a child thread of the user as a session', async () => {
			const { service, threadRepository, txRunner } = setup();
			threadRepository.findOwnedById.mockResolvedValue(null);
			txRunner.run.mockImplementation(async (_ctx, fn) => await fn({}));
			threadRepository.findOrCreate.mockResolvedValue({
				thread: { ...thread, parentThreadId: 'thread-parent' },
				created: false,
			} as never);

			await expect(
				service.createThread({
					agentId: AGENT_ID,
					user,
					projectId: 'project-1',
					threadId: 'thread-1',
					title: 'Renamed',
				}),
			).rejects.toThrow(NotFoundError);
			expect(threadRepository.renameOwned).not.toHaveBeenCalled();
		});
	});
});
