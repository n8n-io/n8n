import type { AuthenticatedRequest, User } from '@n8n/db';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { AgentChatAttachmentService } from '../../agent-chat-attachment.service';
import type { AgentChatExecutionService } from '../../agent-chat-execution.service';
import { AgentChatRelayService } from '../../agent-chat-relay.service';
import type { AgentExecutionOrchestratorService } from '../../agent-execution-orchestrator.service';
import type { AgentMessageQueueService } from '../../agent-message-queue.service';
import type { FlushableResponse } from '../../agent-sse-stream';
import { AgentTurnAlreadyRunningError } from '../../agent-turn-already-running.error';
import type { AgentChatAttachment } from '../../entities/agent-chat-attachment.entity';
import type { AgentExecutionThread } from '../../entities/agent-execution-thread.entity';
import type { N8NCheckpointStorage } from '../../integrations/n8n-checkpoint-storage';
import { SystemAgentChatController } from '../system-agent-chat.controller';
import type { SystemAgentExecutionService } from '../system-agent-execution.service';

const AGENT_ID = 'test-system-agent';
const user = mock<User>({ id: 'user-1' });
const thread = { id: 'thread-1', projectId: 'project-1' } as AgentExecutionThread;

function setup() {
	const systemAgents = mock<SystemAgentExecutionService>();
	const chatRelay = mock<AgentChatRelayService>();
	// The real resume relay, around the stream that each test mocks.
	chatRelay.relayResume.mockImplementation(
		AgentChatRelayService.prototype.relayResume.bind(chatRelay),
	);
	const messageQueue = mock<AgentMessageQueueService>();
	const chatExecutionService = mock<AgentChatExecutionService>();
	const orchestrator = mock<AgentExecutionOrchestratorService>();
	const attachments = mock<AgentChatAttachmentService>();
	const checkpointStorage = mock<N8NCheckpointStorage>();
	systemAgents.getUsableThread.mockResolvedValue(thread);
	systemAgents.findUsableThread.mockResolvedValue(thread);
	systemAgents.resourceIdFor.mockImplementation(({ id }) => `system-chat:${id}`);
	systemAgents.getThread.mockResolvedValue(thread);
	const controller = new SystemAgentChatController(
		systemAgents,
		chatRelay,
		messageQueue,
		chatExecutionService,
		orchestrator,
		checkpointStorage,
		attachments,
	);
	return {
		controller,
		systemAgents,
		chatRelay,
		messageQueue,
		chatExecutionService,
		orchestrator,
		checkpointStorage,
		attachments,
	};
}

function request<P extends object>(params: P, query: Record<string, string> = {}) {
	return { user, params, query } as unknown as AuthenticatedRequest<P>;
}

describe('SystemAgentChatController', () => {
	it('prepares a chat message with the working project from the query', async () => {
		const { controller, systemAgents, chatRelay } = setup();
		chatRelay.relayQueuedMessage.mockImplementation(async (_res, accept) => {
			await accept(vi.fn(), new AbortController().signal);
		});

		await controller.chat(
			request({}, { projectId: 'project-1' }),
			mock<FlushableResponse>(),
			AGENT_ID,
			{ message: 'hi', sessionId: 'thread-1' } as never,
		);

		expect(systemAgents.prepareChatMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				agentId: AGENT_ID,
				user,
				projectId: 'project-1',
				sessionId: 'thread-1',
			}),
		);
	});

	it('passes the client session id when the client starts a new session', async () => {
		const { controller, systemAgents, chatRelay } = setup();
		chatRelay.relayQueuedMessage.mockImplementation(async (_res, accept) => {
			await accept(vi.fn(), new AbortController().signal);
		});

		await controller.chat(
			request({}, { projectId: 'project-1' }),
			mock<FlushableResponse>(),
			AGENT_ID,
			{ message: 'hi', sessionId: 'thread-new', newSession: true } as never,
		);

		expect(systemAgents.prepareChatMessage).toHaveBeenCalledWith(
			expect.objectContaining({ sessionId: 'thread-new' }),
		);
	});

	it('stores chat attachments with the system chat source', async () => {
		const { controller, systemAgents, chatRelay } = setup();
		chatRelay.relayQueuedMessage.mockImplementation(async (_res, accept) => {
			await accept(vi.fn(), new AbortController().signal);
		});
		systemAgents.prepareChatMessage.mockImplementation(async ({ storeAttachments }) => {
			await storeAttachments?.('thread-1', 'project-1');
			return {} as never;
		});

		await controller.chat(
			request({}, { projectId: 'project-1' }),
			mock<FlushableResponse>(),
			AGENT_ID,
			{ message: 'hi', sessionId: 'thread-1' } as never,
		);

		expect(chatRelay.storeChatAttachments).toHaveBeenCalledWith(
			expect.objectContaining({
				threadId: 'thread-1',
				projectId: 'project-1',
				resourceId: 'system-chat:user-1',
				source: 'system_chat',
			}),
		);
	});

	it('lists the queue of a usable thread as system messages', async () => {
		const { controller, systemAgents, messageQueue } = setup();

		await controller.getQueuedMessages(request({ agentId: AGENT_ID, threadId: 'thread-1' }));

		expect(systemAgents.findUsableThread).toHaveBeenCalledWith(AGENT_ID, user, 'thread-1');
		expect(messageQueue.listPending).toHaveBeenCalledWith({
			projectId: 'project-1',
			agentId: AGENT_ID,
			threadId: 'thread-1',
			userId: 'user-1',
			kind: 'system',
		});
	});

	it('lists an empty queue for a new session that has no thread yet', async () => {
		const { controller, systemAgents, messageQueue } = setup();
		systemAgents.findUsableThread.mockResolvedValue(null);

		await expect(
			controller.getQueuedMessages(request({ agentId: AGENT_ID, threadId: 'new-thread' })),
		).resolves.toEqual({ items: [], steerableExecutionId: null });
		expect(messageQueue.listPending).not.toHaveBeenCalled();
	});

	it('steers a queued system message after the floor check', async () => {
		const { controller, systemAgents, messageQueue } = setup();

		await controller.steerQueuedMessage(
			request({ agentId: AGENT_ID, threadId: 'thread-1', queueId: '7' }),
			mock<Response>(),
			{ executionId: 'exec-1' } as never,
		);

		expect(systemAgents.getUsableThread).toHaveBeenCalled();
		expect(messageQueue.steer).toHaveBeenCalledWith(
			expect.objectContaining({ queueId: '7', executionId: 'exec-1', kind: 'system' }),
		);
	});

	it('rejects an invalid queue id before it loads the thread', async () => {
		const { controller, systemAgents } = setup();

		await expect(
			controller.removeQueuedMessage(
				request({ agentId: AGENT_ID, threadId: 'thread-1', queueId: 'x' }),
			),
		).rejects.toThrow(BadRequestError);
		expect(systemAgents.getUsableThread).not.toHaveBeenCalled();
	});

	it('lets the owner stop a turn with the thread working project', async () => {
		const { controller, systemAgents, chatExecutionService } = setup();

		await controller.cancelChatExecution(
			request({}),
			mock<Response>(),
			AGENT_ID,
			'thread-1',
			'exec-1',
		);

		expect(systemAgents.getThread).toHaveBeenCalledWith(AGENT_ID, user, 'thread-1');
		expect(chatExecutionService.requestCancel).toHaveBeenCalledWith({
			projectId: 'project-1',
			agentId: AGENT_ID,
			threadId: 'thread-1',
			executionId: 'exec-1',
			userId: 'user-1',
			surface: 'system',
		});
	});

	it('passes a foreground Stop scope to the cancel request', async () => {
		const { controller, systemAgents, chatExecutionService } = setup();
		systemAgents.getThread.mockResolvedValue(thread);
		chatExecutionService.requestCancel.mockResolvedValue(true);

		await controller.cancelChatExecution(
			request({}),
			mock<Response>(),
			AGENT_ID,
			'thread-1',
			'exec-1',
			{ scope: 'foreground' },
		);

		expect(chatExecutionService.requestCancel).toHaveBeenCalledWith(
			expect.objectContaining({ surface: 'system', scope: 'foreground' }),
		);
	});

	describe('listThreads', () => {
		it('lists the threads of the user with the agent as summaries', async () => {
			const { controller, systemAgents } = setup();
			systemAgents.listThreads.mockResolvedValue([
				{
					...thread,
					title: 'First chat',
					updatedAt: new Date('2026-10-19T10:00:00.000Z'),
					agentName: 'Assistant',
				} as AgentExecutionThread,
			]);

			const result = await controller.listThreads(request({ agentId: AGENT_ID }, { limit: '5' }));

			expect(systemAgents.listThreads).toHaveBeenCalledWith(AGENT_ID, user, 5);
			expect(result).toEqual({
				data: [
					{
						id: 'thread-1',
						title: 'First chat',
						updatedAt: '2026-10-19T10:00:00.000Z',
						projectId: 'project-1',
					},
				],
			});
		});

		it('uses the default page size without a limit', async () => {
			const { controller, systemAgents } = setup();
			systemAgents.listThreads.mockResolvedValue([]);

			await controller.listThreads(request({ agentId: AGENT_ID }));

			expect(systemAgents.listThreads).toHaveBeenCalledWith(AGENT_ID, user, 20);
		});

		it('refuses an agent id without a registered provider', async () => {
			const { controller, systemAgents } = setup();
			systemAgents.listThreads.mockRejectedValue(new NotFoundError('Agent not found'));

			await expect(controller.listThreads(request({ agentId: 'unknown' }))).rejects.toThrow(
				NotFoundError,
			);
		});
	});

	describe('getThread', () => {
		it('returns a usable thread of the user as a summary', async () => {
			const { controller, systemAgents } = setup();
			systemAgents.getUsableThread.mockResolvedValue({
				...thread,
				title: 'First chat',
				updatedAt: new Date('2026-10-19T10:00:00.000Z'),
			} as AgentExecutionThread);

			const result = await controller.getThread(
				request({ agentId: AGENT_ID, threadId: 'thread-1' }),
			);

			expect(systemAgents.getUsableThread).toHaveBeenCalledWith(AGENT_ID, user, 'thread-1');
			expect(result).toEqual({
				id: 'thread-1',
				title: 'First chat',
				updatedAt: '2026-10-19T10:00:00.000Z',
				projectId: 'project-1',
			});
		});

		it('refuses a thread that the user cannot use', async () => {
			const { controller, systemAgents } = setup();
			systemAgents.getUsableThread.mockRejectedValue(new NotFoundError('Session not found'));

			await expect(
				controller.getThread(request({ agentId: AGENT_ID, threadId: 'other' })),
			).rejects.toThrow(NotFoundError);
		});
	});

	it('deletes an owned thread through the execution service', async () => {
		const { controller, systemAgents } = setup();

		const result = await controller.deleteChatThread(
			request({}),
			mock<Response>(),
			AGENT_ID,
			'thread-1',
		);

		expect(systemAgents.deleteThread).toHaveBeenCalledWith(AGENT_ID, user, 'thread-1');
		expect(result).toEqual({ success: true });
	});

	it('refuses to delete a thread the user does not own', async () => {
		const { controller, systemAgents } = setup();
		systemAgents.deleteThread.mockRejectedValue(new NotFoundError('Session not found'));

		await expect(
			controller.deleteChatThread(request({}), mock<Response>(), AGENT_ID, 'thread-2'),
		).rejects.toThrow(NotFoundError);
	});

	describe('attachments', () => {
		it('looks up the attachment in the memory resource of the user and the system chat source', async () => {
			const { controller, attachments } = setup();
			attachments.getForSystemAgent.mockResolvedValue(mock<AgentChatAttachment>());

			await controller.getChatAttachment(
				request({ agentId: AGENT_ID, attachmentId: 'att-1' }),
				mock<Response>(),
			);

			expect(attachments.getForSystemAgent).toHaveBeenCalledWith('att-1', {
				agentId: AGENT_ID,
				resourceId: 'system-chat:user-1',
				source: 'system_chat',
			});
		});

		it('refuses an attachment outside that scope before it loads the thread', async () => {
			const { controller, attachments, chatRelay, systemAgents } = setup();
			attachments.getForSystemAgent.mockResolvedValue(null);

			await expect(
				controller.getChatAttachment(
					request({ agentId: AGENT_ID, attachmentId: 'att-1' }),
					mock<Response>(),
				),
			).rejects.toThrow(NotFoundError);
			expect(systemAgents.getUsableThread).not.toHaveBeenCalled();
			expect(chatRelay.streamAttachment).not.toHaveBeenCalled();
		});

		it('streams an attachment of a usable thread of the user', async () => {
			const { controller, attachments, chatRelay, systemAgents } = setup();
			const attachment = mock<AgentChatAttachment>({
				threadId: 'thread-1',
				resourceId: 'system-chat:user-1',
				source: 'system_chat',
			});
			attachments.getForSystemAgent.mockResolvedValue(attachment);

			await controller.getChatAttachment(
				request({ agentId: AGENT_ID, attachmentId: 'att-1' }),
				mock<Response>(),
			);

			expect(systemAgents.getUsableThread).toHaveBeenCalledWith(AGENT_ID, user, 'thread-1');
			expect(chatRelay.streamAttachment).toHaveBeenCalledWith(attachment, expect.anything());
		});
	});
	it('resumes a run through the execution service and closes the stream', async () => {
		const { controller, systemAgents, chatRelay } = setup();
		const execution = {
			send: vi.fn(),
			onExecutionStarted: vi.fn(),
			onChunk: vi.fn(),
			close: vi.fn(),
		};
		chatRelay.createChatStream.mockReturnValue(execution);

		await controller.chatResume(request({}), mock<FlushableResponse>(), AGENT_ID, {
			runId: 'run-1',
			toolCallId: 'tc-1',
			resumeData: { approved: true },
		} as never);

		expect(systemAgents.resumeRun).toHaveBeenCalledWith({
			agentId: AGENT_ID,
			user,
			runId: 'run-1',
			toolCallId: 'tc-1',
			resumeData: { approved: true },
			send: execution.send,
			onExecutionStarted: execution.onExecutionStarted,
		});
		expect(execution.close).toHaveBeenCalled();
	});

	it('sends a refused resume as an error event', async () => {
		const { controller, systemAgents, chatRelay } = setup();
		const execution = {
			send: vi.fn(),
			onExecutionStarted: vi.fn(),
			onChunk: vi.fn(),
			close: vi.fn(),
		};
		chatRelay.createChatStream.mockReturnValue(execution);
		systemAgents.resumeRun.mockRejectedValue(new NotFoundError('Session not found'));

		await controller.chatResume(request({}), mock<FlushableResponse>(), AGENT_ID, {
			runId: 'run-1',
			toolCallId: 'tc-1',
			resumeData: {},
		} as never);

		expect(execution.send).toHaveBeenCalledWith({ type: 'error', message: 'Session not found' });
		expect(execution.close).toHaveBeenCalled();
	});

	it('sends a resume during a running turn with its error code', async () => {
		const { controller, systemAgents, chatRelay } = setup();
		const execution = {
			send: vi.fn(),
			onExecutionStarted: vi.fn(),
			onChunk: vi.fn(),
			close: vi.fn(),
		};
		chatRelay.createChatStream.mockReturnValue(execution);
		systemAgents.resumeRun.mockRejectedValue(new AgentTurnAlreadyRunningError());

		await controller.chatResume(request({}), mock<FlushableResponse>(), AGENT_ID, {
			runId: 'run-1',
			toolCallId: 'tc-1',
			resumeData: {},
		} as never);

		expect(execution.send).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'error', errorCode: 'turn_already_running' }),
		);
	});

	it('reads the history of a usable thread only', async () => {
		const { controller, systemAgents, orchestrator } = setup();
		systemAgents.getUsableThread.mockRejectedValue(new NotFoundError('Session not found'));

		await expect(
			controller.getChatMessages(request({ agentId: AGENT_ID, threadId: 'thread-1' })),
		).rejects.toThrow(NotFoundError);
		expect(orchestrator.getConversationHistory).not.toHaveBeenCalled();
	});

	it('returns the usage of a usable thread', async () => {
		const { controller, systemAgents } = setup();
		const usage = {
			executions: [],
			total: {
				promptTokens: null,
				completionTokens: null,
				totalTokens: null,
				cacheReadTokens: null,
				cacheWriteTokens: null,
				cost: null,
			},
		};
		systemAgents.getUsage.mockResolvedValue(usage);

		await expect(
			controller.getUsage(request({ agentId: AGENT_ID, threadId: 'thread-1' })),
		).resolves.toBe(usage);
		expect(systemAgents.getUsableThread).toHaveBeenCalledWith(AGENT_ID, user, 'thread-1');
		expect(systemAgents.getUsage).toHaveBeenCalledWith(thread);
	});

	it('reads the usage of a usable thread only', async () => {
		const { controller, systemAgents } = setup();
		systemAgents.getUsableThread.mockRejectedValue(new NotFoundError('Session not found'));

		await expect(
			controller.getUsage(request({ agentId: AGENT_ID, threadId: 'thread-1' })),
		).rejects.toThrow(NotFoundError);
		expect(systemAgents.getUsage).not.toHaveBeenCalled();
	});

	it('cancels a suspended run in the memory scope of the user', async () => {
		const { controller, systemAgents, orchestrator } = setup();
		orchestrator.cancelChatRun.mockResolvedValue(true);

		const result = await controller.cancelChatRun(request({}), mock<Response>(), AGENT_ID, 'run-1');

		expect(systemAgents.assertRegistered).toHaveBeenCalledWith(AGENT_ID);
		expect(orchestrator.cancelChatRun).toHaveBeenCalledWith({
			agentId: AGENT_ID,
			runId: 'run-1',
			resourceId: 'system-chat:user-1',
		});
		expect(result).toEqual({ cancelled: true });
	});

	it('keeps background jobs when a foreground Stop cancels a suspended run', async () => {
		const { controller, orchestrator } = setup();
		orchestrator.cancelChatRun.mockResolvedValue(true);

		await controller.cancelChatRun(request({}), mock<Response>(), AGENT_ID, 'run-1', {
			scope: 'foreground',
		});

		expect(orchestrator.cancelChatRun).toHaveBeenCalledWith({
			agentId: AGENT_ID,
			runId: 'run-1',
			resourceId: 'system-chat:user-1',
			cancelBackgroundJobs: false,
		});
	});
});
