import type { Logger } from '@n8n/backend-common';
import type { TransactionRunner, User } from '@n8n/db';
import { ConflictError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';
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
import type { N8NCheckpointStorage } from '../../integrations/n8n-checkpoint-storage';
import type { AgentExecutionRepository } from '../../repositories/agent-execution.repository';
import type { AgentExecutionThreadRepository } from '../../repositories/agent-execution-thread.repository';
import type { AgentRepository } from '../../repositories/agent.repository';
import type { AgentExecutionStreamChunk } from '../../types/agent-steering';
import type { AgentTurnFinalizeOutcome } from '../../types/agent-turn-outcome';
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
	const agentRepository = mock<AgentRepository>();
	const attachmentService = mock<AgentChatAttachmentService>();

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
		agentRepository,
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
		attachmentService,
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
					resourceId: 'system-chat:user-1',
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
					resourceId: 'system-chat:user-1',
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
