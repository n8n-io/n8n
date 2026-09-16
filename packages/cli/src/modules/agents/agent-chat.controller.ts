import {
	type AgentBackgroundJobsResponse,
	type AgentChatAttachmentPayload,
	type AgentChatAdmissionResponse,
	type AgentChatQueueResponse,
	AgentChatQueueEditDto,
	AgentChatMessageDto,
	type AgentChatMessagesResponse,
	AgentChatResumeDto,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_MB,
	N8N_CHAT_INTEGRATION_TYPE,
	ViewableMimeTypes,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	ProjectScope,
	RestController,
} from '@n8n/decorators';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import { sanitizeFilename } from '@n8n/utils/files/sanitize-filename';
import type { Response } from 'express';
import { FileNotFoundError, getHtmlSandboxCSP } from 'n8n-core';
import { pipeline } from 'node:stream/promises';

import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentsCredentialProvider } from './adapters/agents-credential-provider';
import {
	AgentChatAttachmentService,
	type StoredAttachmentRef,
} from './agent-chat-attachment.service';
import { AgentExecutionOrchestratorService } from './agent-execution-orchestrator.service';
import { AgentExecutionService, threadBelongsTo } from './agent-execution.service';
import { AgentMessageQueueService } from './agent-message-queue.service';
import { messagesToDto } from './agent-message-mapper';
import { pumpChunks } from './agent-sse-stream';
import type { PreviewQueueScope } from './agent-message-queue.types';
import { AgentTestChatService, chatThreadId } from './agent-test-chat.service';
import { AgentTestRunService } from './agent-test-run.service';
import { AgentsService } from './agents.service';
import { AgentsBuilderService } from './builder/agents-builder.service';
import { AgentBackgroundJobService } from './background/agent-background-job.service';
import { draftChatMemoryResourceId } from './utils/agent-memory-scope';
import { resolveInboundMimeType } from './utils/inbound-attachments';
import { withOpenSuspensions } from './utils/messages-envelope';

@RestController('/projects/:projectId/agents/v2')
export class AgentChatController {
	constructor(
		private readonly agentExecutionOrchestratorService: AgentExecutionOrchestratorService,
		private readonly agentTestRunService: AgentTestRunService,
		private readonly agentTestChatService: AgentTestChatService,
		private readonly agentsBuilderService: AgentsBuilderService,
		private readonly credentialsService: CredentialsService,
		private readonly agentsService: AgentsService,
		private readonly agentChatAttachmentService: AgentChatAttachmentService,
		private readonly agentExecutionService: AgentExecutionService,
		private readonly backgroundJobService: AgentBackgroundJobService,
		private readonly messageQueue: AgentMessageQueueService,
	) {}

	/** Decode, sniff, and persist inbound chat attachments; returns refs for the user turn. */
	private async storeChatAttachments(params: {
		attachments: AgentChatAttachmentPayload[] | undefined;
		agentId: string;
		projectId: string;
		threadId: string;
		resourceId: string;
	}): Promise<StoredAttachmentRef[] | undefined> {
		const { attachments, agentId, projectId, threadId, resourceId } = params;
		if (!attachments?.length) return undefined;

		const stored: StoredAttachmentRef[] = [];
		try {
			for (const attachment of attachments) {
				const data = Buffer.from(attachment.data, 'base64');
				if (data.byteLength === 0) {
					throw new BadRequestError(`Attachment "${attachment.fileName}" is empty`);
				}
				if (data.byteLength > MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES) {
					throw new BadRequestError(
						`Attachment "${attachment.fileName}" exceeds the ${MAX_AGENT_CHAT_ATTACHMENT_SIZE_MB} MB limit`,
					);
				}

				const mimeType = await resolveInboundMimeType(attachment.mimeType, data);
				const row = await this.agentChatAttachmentService.storeInbound({
					agentId,
					projectId,
					threadId,
					resourceId,
					source: 'chat',
					fileName: attachment.fileName,
					mimeType,
					data,
				});
				stored.push({
					id: row.id,
					fileName: row.fileName,
					mimeType: row.mimeType,
					sizeBytes: row.fileSizeBytes,
				});
			}
		} catch (error) {
			// Nothing references the already-stored attachments of a rejected message.
			await this.agentChatAttachmentService.deleteByIds(stored.map((ref) => ref.id));
			throw error;
		}
		return stored;
	}

	@Post('/:agentId/chat')
	@ProjectScope('agent:execute')
	async chat(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: AgentChatMessageDto,
	): Promise<AgentChatAdmissionResponse> {
		const { projectId } = req.params;
		const user = req.user;
		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			projectId,
			user,
		);
		const prepared = await this.agentTestRunService.prepareDraftRun({
			agentId,
			projectId,
			sessionId: payload.sessionId,
			credentialProvider,
		});
		if (prepared.status === 'session_not_found') throw new NotFoundError('Session not found');
		if (prepared.status === 'agent_misconfigured') return prepared;
		const threadId = prepared.sessionId;
		const storedAttachments = await this.storeChatAttachments({
			attachments: payload.attachments,
			agentId,
			projectId,
			threadId,
			resourceId: draftChatMemoryResourceId(user.id),
		});
		try {
			const item = await this.messageQueue.enqueuePreview(
				{
					agentId,
					threadId,
					payload: {
						source: 'preview',
						kind: 'message',
						projectId,
						userId: user.id,
						resourceId: draftChatMemoryResourceId(user.id),
						message: payload.message,
						attachments: storedAttachments,
					},
				},
				payload.clientRequestId,
				async (queued, context) => {
					if (queued.kind !== 'message') return;
					await pumpChunks(
						this.agentTestRunService.streamDraftRun({
							agentId,
							projectId,
							sessionId: threadId,
							user,
							previewChat: true,
							message: queued.message,
							attachments: queued.attachments,
							abortSignal: context.abortSignal,
							onExecutionStarted: context.onExecutionStarted,
							onExecutionRecorded: context.onExecutionRecorded,
						}),
						context.send,
					);
				},
			);
			return { status: 'queued', sessionId: threadId, item };
		} catch (error) {
			// After admission, the queue owns attachment cleanup.
			await this.agentChatAttachmentService.deleteByIds(
				storedAttachments?.map(({ id }) => id) ?? [],
			);
			throw error;
		}
	}

	@Post('/:agentId/chat/resume')
	@ProjectScope('agent:execute')
	async chatResume(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Body payload: AgentChatResumeDto,
	): Promise<AgentChatAdmissionResponse> {
		const { projectId } = req.params;
		const user = req.user;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		const memory = await this.messageQueue.getResumeScope(
			agentId,
			payload.runId,
			draftChatMemoryResourceId(user.id),
		);
		const item = await this.messageQueue.enqueuePreview(
			{
				agentId,
				threadId: memory.threadId,
				payload: {
					source: 'preview',
					kind: 'hitl',
					projectId,
					userId: user.id,
					resourceId: memory.resourceId,
					runId: payload.runId,
					toolCallId: payload.toolCallId,
					resumeData: payload.resumeData,
				},
			},
			payload.clientRequestId,
			async (queued, context) => {
				if (queued.kind !== 'hitl') return;
				await pumpChunks(
					this.agentExecutionOrchestratorService.resumeForChat({
						agentId,
						projectId,
						user,
						runId: queued.runId,
						toolCallId: queued.toolCallId,
						resumeData: queued.resumeData,
						usePublishedVersion: false,
						integrationType: N8N_CHAT_INTEGRATION_TYPE,
						previewChat: true,
						expectedMemory: memory,
						abortSignal: context.abortSignal,
						onExecutionStarted: context.onExecutionStarted,
						onExecutionRecorded: context.onExecutionRecorded,
					}),
					context.send,
				);
			},
		);
		return { status: 'queued', sessionId: memory.threadId, item };
	}

	private async previewQueueScope(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	): Promise<PreviewQueueScope> {
		const { projectId, agentId, threadId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		const thread = await this.agentExecutionService.findThreadById(threadId);
		if (thread && !threadBelongsTo(thread, projectId, agentId)) {
			throw new NotFoundError(`Thread "${threadId}" not found`);
		}
		return {
			projectId,
			agentId,
			threadId,
			userId: req.user.id,
			resourceId: draftChatMemoryResourceId(req.user.id),
		};
	}

	@Get('/:agentId/chat/:threadId/queue')
	@ProjectScope('agent:read')
	async getQueue(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	): Promise<AgentChatQueueResponse> {
		return { items: await this.messageQueue.listPreview(await this.previewQueueScope(req)) };
	}

	@Patch('/:agentId/chat/:threadId/queue/:queueId')
	@ProjectScope('agent:execute')
	async editQueuedMessage(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
		_res: Response,
		@Param('queueId') queueId: string,
		@Body payload: AgentChatQueueEditDto,
	) {
		return await this.messageQueue.editPreview(
			await this.previewQueueScope(req),
			queueId,
			payload.message,
		);
	}

	@Delete('/:agentId/chat/:threadId/queue/:queueId')
	@ProjectScope('agent:execute')
	async removeQueuedMessage(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
		_res: Response,
		@Param('queueId') queueId: string,
	) {
		await this.messageQueue.removePreview(await this.previewQueueScope(req), queueId);
		return { removed: true };
	}

	@Post('/:agentId/chat/:threadId/queue/:queueId/stop')
	@ProjectScope('agent:execute')
	async stopQueuedMessage(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
		_res: Response,
		@Param('queueId') queueId: string,
	) {
		return {
			cancelled: await this.messageQueue.stopPreview(await this.previewQueueScope(req), queueId),
		};
	}

	@Delete('/:agentId/chat/runs/:runId')
	@ProjectScope('agent:execute')
	async cancelChatRun(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('runId') runId: string,
	) {
		const { projectId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);

		const resumeCancelled = await this.messageQueue.cancelPreviewResumes(
			{
				agentId,
				projectId,
				userId: req.user.id,
				resourceId: draftChatMemoryResourceId(req.user.id),
			},
			runId,
		);

		const cancelled = await this.agentExecutionOrchestratorService.cancelChatRun({
			agentId,
			runId,
			resourceId: draftChatMemoryResourceId(req.user.id),
			onCancelled: (threadId) => this.messageQueue.notify(threadId),
		});
		return { cancelled: cancelled || resumeCancelled };
	}

	@Get('/:agentId/chat/:threadId/background-tasks')
	@ProjectScope('agent:read')
	async getBackgroundJobs(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	): Promise<AgentBackgroundJobsResponse> {
		const { projectId, agentId, threadId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		const thread = await this.agentExecutionService.findThreadById(threadId);

		// A new preview session has no thread until its first execution starts.
		if (!thread) return { tasks: [] };

		if (!threadBelongsTo(thread, projectId, agentId)) {
			throw new NotFoundError(`Thread "${threadId}" not found`);
		}

		const jobs = await this.backgroundJobService.listCurrentGroupForThread(agentId, threadId);
		return {
			pendingTaskIds: jobs
				.filter((job) => job.status !== 'running' && !job.notifiedAt)
				.map((job) => job.id),
			tasks: jobs.map((job) => ({
				id: job.id,
				title: scrubSecretsInText(job.title),
				kind: job.kind,
				status: job.status,
				startedAt: job.createdAt.toISOString(),
				...(job.settledAt ? { settledAt: job.settledAt.toISOString() } : {}),
			})),
		};
	}

	@Get('/:agentId/chat/:threadId/messages')
	@ProjectScope('agent:read')
	async getChatMessages(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	): Promise<AgentChatMessagesResponse> {
		const { projectId, agentId, threadId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		// getConversationHistory delegates to getThreadDetail, which validates
		// thread ownership against both projectId and agentId before returning
		// execution transcript data.
		const history = await this.agentExecutionOrchestratorService.getConversationHistory({
			threadId,
			projectId,
			agentId,
		});
		const checkpoint = await this.agentsBuilderService.findOpenCheckpointForThread(
			agentId,
			threadId,
		);
		if (!history) {
			if (checkpoint) return withOpenSuspensions([], checkpoint);
			throw new NotFoundError(`Thread "${threadId}" not found`);
		}
		return withOpenSuspensions(history, checkpoint, {
			appendInactiveCheckpointMessages: false,
		});
	}

	@Get('/:agentId/chat/messages')
	@ProjectScope('agent:read')
	async getTestChatMessages(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
	): Promise<AgentChatMessagesResponse> {
		const { projectId, agentId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		const messages = await this.agentTestChatService.getTestChatMessages(agentId, req.user.id);
		const checkpoint = await this.agentsBuilderService.findOpenCheckpointForThread(
			agentId,
			chatThreadId(agentId, req.user.id),
		);
		return withOpenSuspensions(messagesToDto(messages), checkpoint);
	}

	@Get('/:agentId/chat/attachments/:attachmentId')
	@ProjectScope('agent:read')
	async getChatAttachment(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; attachmentId: string }>,
		res: Response,
	) {
		const { projectId, agentId, attachmentId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);

		const attachment = await this.agentChatAttachmentService.getForAgent(attachmentId, {
			agentId,
			projectId,
		});
		if (!attachment) throw new NotFoundError(`Attachment "${attachmentId}" not found`);

		// Open the stream before writing headers: bytes can be gone while the row
		// remains (out-of-band storage cleanup), and that must surface as a clean
		// 404 rather than a half-written response.
		let stream: Awaited<ReturnType<AgentChatAttachmentService['getStream']>>;
		try {
			stream = await this.agentChatAttachmentService.getStream(attachment);
		} catch (error) {
			if (error instanceof FileNotFoundError) {
				throw new NotFoundError(`Attachment "${attachmentId}" is no longer available`);
			}
			throw error;
		}

		res.setHeader('Content-Type', attachment.mimeType);
		res.setHeader('Content-Length', attachment.fileSizeBytes);
		res.setHeader('X-Content-Type-Options', 'nosniff');
		// Sandbox anything rendered inline: attachments are user-supplied content
		// served same-origin, so active content in them must never script against
		// the n8n session (same posture as the binary-data controller).
		res.setHeader('Content-Security-Policy', getHtmlSandboxCSP());
		// Non-viewable types must not render inline in the browser.
		if (!ViewableMimeTypes.includes(attachment.mimeType.toLowerCase())) {
			res.setHeader(
				'Content-Disposition',
				`attachment; filename="${sanitizeFilename(attachment.fileName)}"`,
			);
		}

		// pipeline destroys the source when the client disconnects mid-transfer,
		// so aborted downloads don't leak file descriptors or object-store sockets.
		try {
			await pipeline(stream, res);
		} catch (error) {
			if (
				error instanceof Error &&
				'code' in error &&
				error.code === 'ERR_STREAM_PREMATURE_CLOSE'
			) {
				return;
			}
			throw error;
		}
	}

	@Delete('/:agentId/chat/messages')
	@ProjectScope('agent:update')
	async clearTestChatMessages(req: AuthenticatedRequest<{ projectId: string; agentId: string }>) {
		const { projectId, agentId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		await this.agentTestChatService.clearTestChatMessages(agentId, req.user.id);
		return { ok: true };
	}
}
