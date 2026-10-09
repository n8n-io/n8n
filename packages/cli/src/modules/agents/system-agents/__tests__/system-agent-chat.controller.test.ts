import type { AuthenticatedRequest, User } from '@n8n/db';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { AgentChatAttachmentService } from '../../agent-chat-attachment.service';
import type { AgentChatExecutionService } from '../../agent-chat-execution.service';
import type { AgentChatRelayService } from '../../agent-chat-relay.service';
import type { AgentExecutionOrchestratorService } from '../../agent-execution-orchestrator.service';
import type { AgentMessageQueueService } from '../../agent-message-queue.service';
import type { FlushableResponse } from '../../agent-sse-stream';
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
	const messageQueue = mock<AgentMessageQueueService>();
	const chatExecutionService = mock<AgentChatExecutionService>();
	const orchestrator = mock<AgentExecutionOrchestratorService>();
	const attachments = mock<AgentChatAttachmentService>();
	const checkpointStorage = mock<N8NCheckpointStorage>();
	systemAgents.getUsableThread.mockResolvedValue(thread);
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

	it('lists the queue of a usable thread as system messages', async () => {
		const { controller, systemAgents, messageQueue } = setup();

		await controller.getQueuedMessages(request({ agentId: AGENT_ID, threadId: 'thread-1' }));

		expect(systemAgents.getUsableThread).toHaveBeenCalledWith(AGENT_ID, user, 'thread-1');
		expect(messageQueue.listPending).toHaveBeenCalledWith({
			projectId: 'project-1',
			agentId: AGENT_ID,
			threadId: 'thread-1',
			userId: 'user-1',
			kind: 'system',
		});
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
			surface: 'preview',
		});
	});

	describe('attachments', () => {
		it('refuses an attachment of another user', async () => {
			const { controller, attachments, chatRelay } = setup();
			attachments.getForSystemAgent.mockResolvedValue(
				mock<AgentChatAttachment>({ threadId: 'thread-1', resourceId: 'draft-chat:user-2' }),
			);

			await expect(
				controller.getChatAttachment(
					request({ agentId: AGENT_ID, attachmentId: 'att-1' }),
					mock<Response>(),
				),
			).rejects.toThrow(NotFoundError);
			expect(chatRelay.streamAttachment).not.toHaveBeenCalled();
		});

		it('streams an attachment of a usable thread of the user', async () => {
			const { controller, attachments, chatRelay, systemAgents } = setup();
			const attachment = mock<AgentChatAttachment>({
				threadId: 'thread-1',
				resourceId: 'draft-chat:user-1',
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
			abortSignal: new AbortController().signal,
			onExecutionStarted: vi.fn(),
			onChunk: vi.fn(),
			close: vi.fn(),
		};
		chatRelay.createChatExecution.mockReturnValue(execution);

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
		});
		expect(execution.close).toHaveBeenCalled();
	});

	it('sends a refused resume as an error event', async () => {
		const { controller, systemAgents, chatRelay } = setup();
		const execution = {
			send: vi.fn(),
			abortSignal: new AbortController().signal,
			onExecutionStarted: vi.fn(),
			onChunk: vi.fn(),
			close: vi.fn(),
		};
		chatRelay.createChatExecution.mockReturnValue(execution);
		systemAgents.resumeRun.mockRejectedValue(new NotFoundError('Session not found'));

		await controller.chatResume(request({}), mock<FlushableResponse>(), AGENT_ID, {
			runId: 'run-1',
			toolCallId: 'tc-1',
			resumeData: {},
		} as never);

		expect(execution.send).toHaveBeenCalledWith({ type: 'error', message: 'Session not found' });
		expect(execution.close).toHaveBeenCalled();
	});

	it('reads the history of a usable thread only', async () => {
		const { controller, systemAgents, orchestrator } = setup();
		systemAgents.getUsableThread.mockRejectedValue(new NotFoundError('Session not found'));

		await expect(
			controller.getChatMessages(request({ agentId: AGENT_ID, threadId: 'thread-1' })),
		).rejects.toThrow(NotFoundError);
		expect(orchestrator.getConversationHistory).not.toHaveBeenCalled();
	});

	it('cancels a suspended run in the memory scope of the user', async () => {
		const { controller, systemAgents, orchestrator } = setup();
		orchestrator.cancelChatRun.mockResolvedValue(true);

		const result = await controller.cancelChatRun(request({}), mock<Response>(), AGENT_ID, 'run-1');

		expect(systemAgents.assertRegistered).toHaveBeenCalledWith(AGENT_ID);
		expect(orchestrator.cancelChatRun).toHaveBeenCalledWith({
			agentId: AGENT_ID,
			runId: 'run-1',
			resourceId: 'draft-chat:user-1',
		});
		expect(result).toEqual({ cancelled: true });
	});
});
