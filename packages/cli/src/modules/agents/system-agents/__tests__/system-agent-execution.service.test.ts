import type { AgentSseEvent } from '@n8n/api-types';
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
import { ExecutionRecorder, type TimelineEvent } from '../../execution-recorder';
import type { N8NCheckpointStorage } from '../../integrations/n8n-checkpoint-storage';
import type { AgentExecutionRepository } from '../../repositories/agent-execution.repository';
import type { AgentExecutionThreadRepository } from '../../repositories/agent-execution-thread.repository';
import type { AgentRepository } from '../../repositories/agent.repository';
import type { AgentExecutionStreamChunk } from '../../types/agent-steering';
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
const thread = {
	id: 'thread-1',
	agentId: AGENT_ID,
	agentName: 'Test Assistant',
	projectId: 'project-1',
	accessScope: 'user',
	ownerId: 'user-1',
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
			const context = setup([textChunk], source);
			context.turnExecutionService.execute.mockImplementation(async function* (config) {
				context.prepared.push(await config.prepare());
				yield textChunk;
				await config.onBeforeFinalize?.({ executionId: 'exec-1', status: 'cancelled' });
			});
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
			const { service, provider, handle, onSettled, logger } = setup([textChunk]);
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
	});
});
