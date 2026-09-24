import {
	type AgentBackgroundJobsResponse,
	type AgentChatAttachmentPayload,
	AgentChatMessageDto,
	AgentChatQueueUpdateDto,
	type AgentChatMessagesResponse,
	type AgentChatQueueResponse,
	AgentChatResumeDto,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_MB,
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
import { redactDeep } from '@n8n/utils/redaction/redact-text';
import { sanitizeFilename } from '@n8n/utils/files/sanitize-filename';
import type { Response } from 'express';
import { FileNotFoundError, getHtmlSandboxCSP } from 'n8n-core';
import { pipeline } from 'node:stream/promises';

import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { AgentsCredentialProvider } from './adapters/agents-credential-provider';
import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import type { StoredAttachmentRef } from './types/agent-chat-attachment';
import { AgentExecutionOrchestratorService } from './agent-execution-orchestrator.service';
import { AgentMessageQueueService } from './agent-message-queue.service';
import { AgentQueuedPreviewStreamService } from './agent-queued-preview-stream.service';
import {
	AgentChatExecutionService,
	AgentTurnAlreadyRunningError,
} from './agent-chat-execution.service';
import { AgentExecutionService } from './agent-execution.service';
import { threadBelongsTo } from './utils/agent-thread-access';
import { messagesToDto } from './agent-message-mapper';
import { type FlushableResponse, initSseStream } from './agent-sse-stream';
import { AgentTestChatService, chatThreadId } from './agent-test-chat.service';
import { AgentTestRunService } from './agent-test-run.service';
import { AgentsService } from './agents.service';
import { AgentsBuilderService } from './builder/agents-builder.service';
import { AgentBackgroundJobService } from './background/agent-background-job.service';
import {
	draftChatMemoryResourceId,
	userIdFromDraftChatMemoryResourceId,
} from './utils/agent-memory-scope';
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
		private readonly chatExecutionService: AgentChatExecutionService,
		private readonly messageQueue: AgentMessageQueueService,
		private readonly queuedPreviewStreams: AgentQueuedPreviewStreamService,
	) {}

	private createChatExecution(res: FlushableResponse) {
		const delivery = initSseStream(res);
		const requestController = new AbortController();
		const abandon = () => requestController.abort();
		delivery.abortSignal.addEventListener('abort', abandon, { once: true });
		if (delivery.abortSignal.aborted) abandon();
		return {
			send: delivery.send,
			abortSignal: requestController.signal,
			onExecutionStarted: (id: string, sessionId: string) => {
				delivery.abortSignal.removeEventListener('abort', abandon);
				delivery.send({ type: 'execution-started', executionId: id, sessionId });
			},
			onChunk: delivery.onChunk,
			close: () => {
				delivery.abortSignal.removeEventListener('abort', abandon);
				delivery.close();
			},
		};
	}

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

	@Post('/:agentId/chat', { usesTemplates: true })
	@ProjectScope('agent:execute')
	async chat(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: FlushableResponse,
		@Param('agentId') agentId: string,
		@Body payload: AgentChatMessageDto,
	) {
		const { projectId } = req.params;
		// The text-or-attachment invariant is enforced by the DTO schema.
		const { message, sessionId, newSession, attachments } = payload;

		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			projectId,
			req.user,
			agentId,
		);

		const delivery = initSseStream(res);
		const { send, abortSignal } = delivery;
		let accepted = false;
		let subscription: ReturnType<AgentQueuedPreviewStreamService['subscribe']> | undefined;
		let storedAttachments: StoredAttachmentRef[] | undefined;
		try {
			const prepared = await this.agentTestRunService.prepareDraftRun({
				agentId,
				projectId,
				user: req.user,
				sessionId,
				previewChat: true,
				newSession,
				credentialProvider,
			});
			if (abortSignal.aborted) return;
			if (prepared.status === 'session_not_found') {
				send({ type: 'error', message: 'Session not found' });
				return;
			}
			if (prepared.status === 'agent_misconfigured') {
				send({
					type: 'error',
					message: 'This agent is not ready to run yet.',
					errorCode: 'agent_misconfigured',
					missing: prepared.missing,
				});
				return;
			}

			const threadId = prepared.sessionId;
			storedAttachments = await this.storeChatAttachments({
				attachments,
				agentId,
				projectId,
				threadId,
				resourceId: draftChatMemoryResourceId(req.user.id),
			});
			abortSignal.throwIfAborted();

			const item = await this.messageQueue.enqueue(
				{
					agentId,
					projectId,
					threadId,
					sessionMode: prepared.sessionMode,
					source: 'chat',
					payload: {
						kind: 'preview',
						message,
						attachments: storedAttachments,
						userId: req.user.id,
						resourceId: draftChatMemoryResourceId(req.user.id),
					},
				},
				(queueId) => {
					subscription = this.queuedPreviewStreams.subscribe(queueId, delivery);
				},
			);
			accepted = true;
			subscription?.accepted();
			send({ type: 'message-queued', queueId: item.id, sessionId: threadId });
			await subscription?.done;
		} catch (error) {
			// Committed messages own their attachments, including after a disconnect.
			if (!accepted && storedAttachments?.length) {
				await this.agentChatAttachmentService
					.deleteByIds(storedAttachments.map((ref) => ref.id))
					.catch(() => {});
			}
			const errorMessage = error instanceof Error ? error.message : 'Chat failed';
			send({
				type: 'error',
				message: errorMessage,
				...(error instanceof AgentTurnAlreadyRunningError
					? { errorCode: 'turn_already_running' }
					: {}),
			});
		} finally {
			subscription?.close();
			delivery.close();
		}
	}

	@Post('/:agentId/chat/resume', { usesTemplates: true })
	@ProjectScope('agent:execute')
	async chatResume(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: FlushableResponse,
		@Param('agentId') agentId: string,
		@Body payload: AgentChatResumeDto,
	) {
		const { projectId } = req.params;
		const { runId, toolCallId, resumeData } = payload;
		const execution = this.createChatExecution(res);
		const { send, onChunk, abortSignal, onExecutionStarted } = execution;
		try {
			abortSignal.throwIfAborted();
			const result = await this.agentTestRunService.resumePreparedDraftRun({
				agentId,
				projectId,
				runId,
				toolCallId,
				resumeData,
				user: req.user,
				previewChat: true,
				errorMode: 'forward',
				onChunk,
				onExecutionStarted,
				abortSignal,
			});
			if (result.status === 'completed') {
				send({
					type: 'done',
					...(result.executionId ? { executionId: result.executionId } : {}),
				});
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Resume failed';
			send({
				type: 'error',
				message: errorMessage,
				...(error instanceof AgentTurnAlreadyRunningError
					? { errorCode: 'turn_already_running' }
					: {}),
			});
		} finally {
			execution.close();
		}
	}

	@Delete('/:agentId/chat/:threadId/executions/:executionId')
	@ProjectScope('agent:execute')
	async cancelChatExecution(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('threadId') threadId: string,
		@Param('executionId') executionId: string,
	) {
		const cancelRequested = await this.chatExecutionService.requestCancel({
			projectId: req.params.projectId,
			agentId,
			threadId,
			executionId,
			userId: req.user.id,
		});
		return { cancelRequested };
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

		const cancelled = await this.agentExecutionOrchestratorService.cancelChatRun({
			agentId,
			runId,
			resourceId: draftChatMemoryResourceId(req.user.id),
		});
		return { cancelled };
	}

	@Get('/:agentId/chat/:threadId/queue')
	@ProjectScope('agent:read')
	async getQueuedMessages(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	): Promise<AgentChatQueueResponse> {
		const agent = await this.agentsService.findById(req.params.agentId, req.params.projectId);
		if (!agent) throw new NotFoundError('Agent not found');
		return await this.messageQueue.listPending({ ...req.params, userId: req.user.id });
	}

	@Patch('/:agentId/chat/:threadId/queue/:queueId')
	@ProjectScope('agent:execute')
	async updateQueuedMessage(
		req: AuthenticatedRequest<{
			projectId: string;
			agentId: string;
			threadId: string;
			queueId: string;
		}>,
		_res: Response,
		@Body payload: AgentChatQueueUpdateDto,
	): Promise<void> {
		if (!/^[1-9]\d*$/.test(req.params.queueId)) throw new BadRequestError('Invalid queue ID');
		const agent = await this.agentsService.findById(req.params.agentId, req.params.projectId);
		if (!agent) throw new NotFoundError('Agent not found');
		await this.messageQueue.updatePending({
			...req.params,
			userId: req.user.id,
			message: payload.message,
		});
	}

	@Delete('/:agentId/chat/:threadId/queue/:queueId')
	@ProjectScope('agent:execute')
	async removeQueuedMessage(
		req: AuthenticatedRequest<{
			projectId: string;
			agentId: string;
			threadId: string;
			queueId: string;
		}>,
	) {
		if (!/^[1-9]\d*$/.test(req.params.queueId)) throw new BadRequestError('Invalid queue ID');
		const agent = await this.agentsService.findById(req.params.agentId, req.params.projectId);
		if (!agent) throw new NotFoundError('Agent not found');
		await this.messageQueue.removePending({ ...req.params, userId: req.user.id });
		return { removed: true };
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

		if (!threadBelongsTo(thread, projectId, agentId, req.user.id)) {
			throw new NotFoundError(`Thread "${threadId}" not found`);
		}

		const jobs = await this.backgroundJobService.listCurrentGroupForThread(agentId, threadId);
		return {
			pendingTaskIds: jobs
				.filter((job) => job.status !== 'running' && job.status !== 'suspended' && !job.notifiedAt)
				.map((job) => job.id),
			tasks: jobs.map((job) => ({
				id: job.id,
				title: scrubSecretsInText(job.title),
				kind: job.kind,
				status: job.status,
				...(job.approval
					? {
							approval: {
								...job.approval,
								suspendPayload: redactDeep(job.approval.suspendPayload, {
									redactSensitiveKeys: true,
								}).value,
							},
						}
					: {}),
				startedAt: job.createdAt.toISOString(),
				...(job.settledAt ? { settledAt: job.settledAt.toISOString() } : {}),
			})),
		};
	}

	@Post('/:agentId/chat/:threadId/background-tasks/resume')
	@ProjectScope('agent:execute')
	async resumeBackgroundJob(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
		_res: Response,
		@Body payload: AgentChatResumeDto,
	) {
		const { projectId, agentId, threadId } = req.params;
		const resumed = await this.agentExecutionOrchestratorService.resumeBackgroundForChat({
			...payload,
			resumeData: payload.resumeData,
			projectId,
			agentId,
			user: req.user,
			usePublishedVersion: false,
			previewChat: true,
			expectedMemory: { threadId, resourceId: draftChatMemoryResourceId(req.user.id) },
		});
		if (!resumed) throw new BadRequestError('This background approval is no longer available');
		return { resumed };
	}

	@Get('/:agentId/chat/:threadId/messages')
	@ProjectScope('agent:read')
	async getChatMessages(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	): Promise<AgentChatMessagesResponse> {
		const { projectId, agentId, threadId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		const thread = await this.agentExecutionService.findThreadById(threadId);
		if (thread && !threadBelongsTo(thread, projectId, agentId, req.user.id)) {
			throw new NotFoundError(`Thread "${threadId}" not found`);
		}
		const history = await this.agentExecutionOrchestratorService.getConversationHistory({
			threadId,
			projectId,
			agentId,
			userId: req.user.id,
		});
		const checkpoint = await this.agentsBuilderService.findOpenCheckpointForThread(
			agentId,
			threadId,
		);
		if (
			checkpoint &&
			(thread?.accessScope === 'project'
				? userIdFromDraftChatMemoryResourceId(checkpoint.persistence?.resourceId ?? '') !==
					undefined
				: checkpoint.persistence?.resourceId !== draftChatMemoryResourceId(req.user.id) ||
					(!thread &&
						!(await this.agentExecutionService.canUseDraftThread(
							threadId,
							projectId,
							agentId,
							req.user.id,
						))))
		) {
			throw new NotFoundError(`Thread "${threadId}" not found`);
		}
		if (!history) {
			if (checkpoint) return { ...withOpenSuspensions([], checkpoint), activeExecutionId: null };
			throw new NotFoundError(`Thread "${threadId}" not found`);
		}
		return {
			...withOpenSuspensions(history.messages, checkpoint, {
				appendInactiveCheckpointMessages: false,
			}),
			activeExecutionId: history.activeExecutionId,
		};
	}

	@Get('/:agentId/chat/messages')
	@ProjectScope('agent:read')
	async getTestChatMessages(
		req: AuthenticatedRequest<{ projectId: string; agentId: string }>,
	): Promise<AgentChatMessagesResponse> {
		const { projectId, agentId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		if (
			!(await this.agentExecutionService.canUseDraftThread(
				chatThreadId(agentId, req.user.id),
				projectId,
				agentId,
				req.user.id,
			))
		) {
			throw new NotFoundError('Session not found');
		}
		const messages = await this.agentTestChatService.getTestChatMessages(agentId, req.user.id);
		const checkpoint = await this.agentsBuilderService.findOpenCheckpointForThread(
			agentId,
			chatThreadId(agentId, req.user.id),
		);
		return withOpenSuspensions(
			messagesToDto(messages),
			checkpoint?.persistence?.resourceId === draftChatMemoryResourceId(req.user.id)
				? checkpoint
				: null,
		);
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
			userId: req.user.id,
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
		if (
			!(await this.agentExecutionService.canUseDraftThread(
				chatThreadId(agentId, req.user.id),
				projectId,
				agentId,
				req.user.id,
			))
		) {
			throw new NotFoundError('Session not found');
		}
		await this.agentTestChatService.clearTestChatMessages(agentId, req.user.id);
		return { ok: true };
	}
}
