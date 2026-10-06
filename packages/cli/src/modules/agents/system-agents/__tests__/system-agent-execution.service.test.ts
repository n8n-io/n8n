import type { Logger } from '@n8n/backend-common';
import type { TransactionRunner, User } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { AgentChatExecutionService } from '../../agent-chat-execution.service';
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
import { SystemAgentExecutionService } from '../system-agent-execution.service';
import { SystemAgentRegistry } from '../system-agent-registry';
import type {
	SystemAgentProvider,
	SystemAgentTurn,
	SystemAgentTurnHandle,
} from '../system-agent.types';

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

function setup(chunks: AgentExecutionStreamChunk[] = []) {
	const registry = new SystemAgentRegistry();
	const threadRepository = mock<AgentExecutionThreadRepository>();
	const executionRepository = mock<AgentExecutionRepository>();
	const turnExecutionService = mock<AgentTurnExecutionService>();
	const messageQueue = mock<AgentMessageQueueService>();
	const checkpointStorage = mock<N8NCheckpointStorage>();

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
		authorize: vi.fn(async () => true),
		prepareTurn: vi.fn(async (_turn: SystemAgentTurn) => handle),
		normalizeResumeData: vi.fn((data: unknown) => ({ normalized: data })),
	} satisfies SystemAgentProvider;
	registry.register(provider);

	threadRepository.findOwnedById.mockResolvedValue(thread);
	executionRepository.findExecution.mockResolvedValue(null);
	// Collect the prepared request, then stream the scripted chunks.
	const prepared: AgentTurnRequest[] = [];
	turnExecutionService.execute.mockImplementation(async function* (config) {
		prepared.push(await config.prepare());
		yield* chunks;
	});

	const service = new SystemAgentExecutionService(
		mock<Logger>(),
		registry,
		mock<AgentRepository>(),
		threadRepository,
		executionRepository,
		turnExecutionService,
		messageQueue,
		mock<AgentChatExecutionService>(),
		checkpointStorage,
		mock<TransactionRunner>(),
		mock(),
	);

	return {
		service,
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
	};
}

function claimFor(options: Record<string, unknown> = {}): ClaimedAgentMessage {
	return {
		item: { id: 'queue-1' },
		thread,
		payload: {
			kind: 'preview',
			message: 'Build me a workflow',
			resourceId: 'draft-chat:user-1',
			options,
		},
		admission: { executionId: 'exec-1', startedAt: new Date(), inputMessageIds: ['m-1'] },
		recording: { threadId: 'thread-1' },
	} as unknown as ClaimedAgentMessage;
}

const textChunk = { type: 'text-delta', id: 't-1', delta: 'Hello' } as AgentExecutionStreamChunk;

describe('SystemAgentExecutionService', () => {
	describe('sendMessage', () => {
		it('enqueues a preview message with the provider turn options', async () => {
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
					kind: 'preview',
					userId: 'user-1',
					message: 'hello',
					resourceId: 'draft-chat:user-1',
					attachments: undefined,
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
			const suspended = {
				type: 'tool-call-suspended',
				runId: 'run-1',
				toolCallId: 'tc-1',
				toolName: 'ask-user',
				input: {},
				suspendPayload: { requestId: 'req-1' },
			} as unknown as AgentExecutionStreamChunk;
			const { service, onSettled } = setup([suspended]);
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

	describe('assertCanUse', () => {
		it('throws NotFoundError for an agent id without a registered provider', async () => {
			const { service } = setup();

			await expect(service.assertCanUse('unknown-agent', user, 'project-1')).rejects.toThrow(
				NotFoundError,
			);
		});
	});
});
