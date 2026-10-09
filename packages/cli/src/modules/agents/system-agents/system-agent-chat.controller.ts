import {
	type AgentBackgroundJobsResponse,
	AgentChatMessageDto,
	type AgentChatMessagesResponse,
	AgentChatQueueReorderDto,
	type AgentChatQueueResponse,
	AgentChatQueueSteerDto,
	AgentChatQueueUpdateDto,
	AgentChatResumeDto,
	type AgentThreadUsageResponse,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, Patch, Post, RestController } from '@n8n/decorators';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import type { Response } from 'express';

import { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import { AgentChatExecutionService } from '../agent-chat-execution.service';
import { AgentChatRelayService } from '../agent-chat-relay.service';
import { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import { AgentMessageQueueService } from '../agent-message-queue.service';
import type { FlushableResponse } from '../agent-sse-stream';
import { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import { draftChatMemoryResourceId } from '../utils/agent-memory-scope';
import { withOpenSuspensions } from '../utils/messages-envelope';
import { SystemAgentExecutionService } from './system-agent-execution.service';

/**
 * Chat routes of code-defined system agents. They are not project routes: the
 * working project comes from the thread, or from the `projectId` query for a
 * new session. So the routes take no `@ProjectScope` decorator, and the
 * project-agent routes keep their `agent:execute` guards unchanged.
 *
 * `SystemAgentExecutionService` checks access on every route: thread
 * ownership, and for routes that read or continue a conversation also the
 * runtime floor (`project:read` on the working project) and the provider's
 * own checks. Stopping a turn needs thread ownership only.
 */
@RestController('/agents/system')
export class SystemAgentChatController {
	constructor(
		private readonly systemAgents: SystemAgentExecutionService,
		private readonly chatRelay: AgentChatRelayService,
		private readonly messageQueue: AgentMessageQueueService,
		private readonly chatExecutionService: AgentChatExecutionService,
		private readonly orchestrator: AgentExecutionOrchestratorService,
		private readonly checkpointStorage: N8NCheckpointStorage,
		private readonly attachments: AgentChatAttachmentService,
	) {}

	/**
	 * Queue a message. An existing session keeps its working project. A new
	 * session needs `projectId` in the query.
	 */
	@Post('/:agentId/chat', { usesTemplates: true })
	async chat(
		req: AuthenticatedRequest<{}, {}, {}, { projectId?: string }>,
		res: FlushableResponse,
		@Param('agentId') agentId: string,
		@Body payload: AgentChatMessageDto,
	) {
		const projectId = typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
		const { message, sessionId, messageId, newSession, attachments, clientContext } = payload;
		await this.chatRelay.relayQueuedMessage(
			res,
			async () =>
				await this.systemAgents.prepareChatMessage({
					agentId,
					user: req.user,
					projectId,
					sessionId: newSession ? undefined : sessionId,
					message,
					messageId,
					clientContext,
					storeAttachments: async (threadId, projectId) =>
						await this.chatRelay.storeChatAttachments({
							attachments,
							agentId,
							projectId,
							threadId,
							resourceId: draftChatMemoryResourceId(req.user.id),
						}),
				}),
		);
	}

	@Post('/:agentId/chat/resume', { usesTemplates: true })
	async chatResume(
		req: AuthenticatedRequest,
		res: FlushableResponse,
		@Param('agentId') agentId: string,
		@Body payload: AgentChatResumeDto,
	) {
		const execution = this.chatRelay.createChatExecution(res);
		try {
			execution.abortSignal.throwIfAborted();
			await this.systemAgents.resumeRun({
				agentId,
				user: req.user,
				runId: payload.runId,
				toolCallId: payload.toolCallId,
				resumeData: payload.resumeData,
				send: execution.send,
			});
		} catch (error) {
			execution.send({
				type: 'error',
				message: error instanceof Error ? error.message : 'Resume failed',
			});
		} finally {
			execution.close();
		}
	}

	/** Stop a running turn. Only the thread owner can stop it. */
	@Delete('/:agentId/chat/:threadId/executions/:executionId')
	async cancelChatExecution(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('threadId') threadId: string,
		@Param('executionId') executionId: string,
	) {
		const thread = await this.systemAgents.getThread(agentId, req.user, threadId);
		const cancelRequested = await this.chatExecutionService.requestCancel({
			projectId: thread.projectId,
			agentId,
			threadId: thread.id,
			executionId,
			userId: req.user.id,
			surface: 'preview',
		});
		return { cancelRequested };
	}

	/** Cancel a suspended run of the user. */
	@Delete('/:agentId/chat/runs/:runId')
	async cancelChatRun(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('runId') runId: string,
	) {
		this.systemAgents.assertRegistered(agentId);
		const cancelled = await this.orchestrator.cancelChatRun({
			agentId,
			runId,
			resourceId: draftChatMemoryResourceId(req.user.id),
		});
		return { cancelled };
	}

	@Get('/:agentId/chat/:threadId/messages')
	async getChatMessages(
		req: AuthenticatedRequest<{ agentId: string; threadId: string }>,
	): Promise<AgentChatMessagesResponse> {
		const { agentId, threadId } = req.params;
		const thread = await this.systemAgents.getUsableThread(agentId, req.user, threadId);
		const history = await this.orchestrator.getConversationHistory({
			threadId: thread.id,
			projectId: thread.projectId,
			agentId,
			userId: req.user.id,
		});
		const checkpoint = await this.checkpointStorage.findSuspendedForThread(agentId, thread.id);
		const ownCheckpoint =
			checkpoint?.persistence?.resourceId === draftChatMemoryResourceId(req.user.id)
				? checkpoint
				: null;
		if (!history) {
			return { ...withOpenSuspensions([], ownCheckpoint), activeExecutionId: null };
		}
		return {
			...withOpenSuspensions(history.messages, ownCheckpoint, {
				appendInactiveCheckpointMessages: false,
			}),
			activeExecutionId: history.activeExecutionId,
		};
	}

	@Get('/:agentId/chat/attachments/:attachmentId')
	async getChatAttachment(
		req: AuthenticatedRequest<{ agentId: string; attachmentId: string }>,
		res: Response,
	) {
		const { agentId, attachmentId } = req.params;
		this.systemAgents.assertRegistered(agentId);
		const attachment = await this.attachments.getForSystemAgent(attachmentId, agentId);
		if (attachment?.resourceId !== draftChatMemoryResourceId(req.user.id)) {
			throw new NotFoundError(`Attachment "${attachmentId}" not found`);
		}
		await this.systemAgents.getUsableThread(agentId, req.user, attachment.threadId);
		await this.chatRelay.streamAttachment(attachment, res);
	}

	/** System agents do not run Agents background jobs. */
	@Get('/:agentId/chat/:threadId/background-tasks')
	async getBackgroundJobs(
		req: AuthenticatedRequest<{ agentId: string; threadId: string }>,
	): Promise<AgentBackgroundJobsResponse> {
		await this.systemAgents.getUsableThread(req.params.agentId, req.user, req.params.threadId);
		return { tasks: [] };
	}

	@Get('/:agentId/chat/:threadId/usage')
	async getUsage(
		req: AuthenticatedRequest<{ agentId: string; threadId: string }>,
	): Promise<AgentThreadUsageResponse> {
		const thread = await this.systemAgents.getUsableThread(
			req.params.agentId,
			req.user,
			req.params.threadId,
		);
		return await this.systemAgents.getUsage(thread);
	}

	// ── Queue ────────────────────────────────────────────────────────────────

	@Get('/:agentId/chat/:threadId/queue')
	async getQueuedMessages(
		req: AuthenticatedRequest<{ agentId: string; threadId: string }>,
	): Promise<AgentChatQueueResponse> {
		const thread = await this.systemAgents.getUsableThread(
			req.params.agentId,
			req.user,
			req.params.threadId,
		);
		return await this.messageQueue.listPending({
			...this.queueScope(req, thread.projectId),
			kind: 'system',
		});
	}

	@Patch('/:agentId/chat/:threadId/queue/:queueId')
	async updateQueuedMessage(
		req: AuthenticatedRequest<{ agentId: string; threadId: string; queueId: string }>,
		_res: Response,
		@Body payload: AgentChatQueueUpdateDto,
	): Promise<void> {
		const thread = await this.usableQueueThread(req);
		await this.messageQueue.updatePending({
			...this.queueScope(req, thread.projectId),
			queueId: req.params.queueId,
			message: payload.message,
			kind: 'system',
		});
	}

	@Post('/:agentId/chat/:threadId/queue/:queueId/reorder')
	async reorderQueuedMessage(
		req: AuthenticatedRequest<{ agentId: string; threadId: string; queueId: string }>,
		_res: Response,
		@Body payload: AgentChatQueueReorderDto,
	): Promise<void> {
		const thread = await this.usableQueueThread(req);
		await this.messageQueue.reorderPending({
			...this.queueScope(req, thread.projectId),
			queueId: req.params.queueId,
			targetQueueId: payload.targetQueueId,
			expectedQueueIds: payload.expectedQueueIds,
			kind: 'system',
		});
	}

	@Delete('/:agentId/chat/:threadId/queue/:queueId')
	async removeQueuedMessage(
		req: AuthenticatedRequest<{ agentId: string; threadId: string; queueId: string }>,
	) {
		const thread = await this.usableQueueThread(req);
		await this.messageQueue.removePending({
			...this.queueScope(req, thread.projectId),
			queueId: req.params.queueId,
			kind: 'system',
		});
		return { removed: true };
	}

	@Post('/:agentId/chat/:threadId/queue/:queueId/steer')
	async steerQueuedMessage(
		req: AuthenticatedRequest<{ agentId: string; threadId: string; queueId: string }>,
		_res: Response,
		@Body payload: AgentChatQueueSteerDto,
	): Promise<void> {
		const thread = await this.usableQueueThread(req);
		await this.messageQueue.steer({
			...this.queueScope(req, thread.projectId),
			queueId: req.params.queueId,
			executionId: payload.executionId,
			kind: 'system',
		});
	}

	private async usableQueueThread(
		req: AuthenticatedRequest<{ agentId: string; threadId: string; queueId: string }>,
	) {
		if (!/^[1-9]\d*$/.test(req.params.queueId)) throw new BadRequestError('Invalid queue ID');
		return await this.systemAgents.getUsableThread(
			req.params.agentId,
			req.user,
			req.params.threadId,
		);
	}

	private queueScope(
		req: AuthenticatedRequest<{ agentId: string; threadId: string }>,
		projectId: string,
	) {
		return {
			projectId,
			agentId: req.params.agentId,
			threadId: req.params.threadId,
			userId: req.user.id,
		};
	}
}
