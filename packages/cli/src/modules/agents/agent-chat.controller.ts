import {
	type AgentBackgroundJobsResponse,
	type AgentChatAttachmentPayload,
	AgentChatMessageDto,
	AgentChatQueueUpdateDto,
	AgentChatQueueSteerDto,
	AgentChatQueueReorderDto,
	type AgentChatMessagesResponse,
	type AgentChatQueueResponse,
	type AgentSseEvent,
	AgentChatResumeDto,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_MB,
	N8N_CHAT_INTEGRATION_TYPE,
	ViewableMimeTypes,
} from '@n8n/api-types';
import { AgentsConfig } from '@n8n/config';
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
import { randomUUID } from 'node:crypto';

import { CredentialsService } from '@/credentials/credentials.service';
import { BadRequestError, NotFoundError } from '@n8n/errors';

import { AgentsCredentialProvider } from './adapters/agents-credential-provider';
import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import type { AgentChatAttachment } from './entities/agent-chat-attachment.entity';
import type { StoredAttachmentRef } from './types/agent-chat-attachment';
import { AgentExecutionOrchestratorService } from './agent-execution-orchestrator.service';
import { AgentMessageQueueService } from './agent-message-queue.service';
import { AgentQueuedPreviewStreamService } from './agent-queued-preview-stream.service';
import {
	AgentChatExecutionService,
	AgentTurnAlreadyRunningError,
} from './agent-chat-execution.service';
import { AgentExecutionService } from './agent-execution.service';
import {
	type AgentSessionMode,
	N8N_CHAT_PRODUCTION_SOURCE,
	threadBelongsTo,
} from './utils/agent-thread-access';
import { messagesToDto } from './agent-message-mapper';
import { type FlushableResponse, initSseStream } from './agent-sse-stream';
import { AgentTestChatService, chatThreadId } from './agent-test-chat.service';
import { AgentTestRunService } from './agent-test-run.service';
import { AgentsService } from './agents.service';
import { AgentsBuilderService } from './builder/agents-builder.service';
import { AgentBackgroundJobService } from './background/agent-background-job.service';
import {
	draftChatMemoryResourceId,
	productionChatMemoryResourceId,
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
		private readonly agentsConfig: AgentsConfig,
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
			onExecutionStarted: (id: string, sessionId: string, inputMessageIds: string[]) => {
				delivery.abortSignal.removeEventListener('abort', abandon);
				delivery.send({ type: 'execution-started', executionId: id, sessionId, inputMessageIds });
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
		source?: string;
	}): Promise<StoredAttachmentRef[] | undefined> {
		const { attachments, agentId, projectId, threadId, resourceId, source = 'chat' } = params;
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
					source,
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

	private async requireProductionChat(agentId: string, projectId: string): Promise<void> {
		if (!(await this.agentsService.isN8nChatPublished(agentId, projectId))) {
			throw new NotFoundError('Agent is not available in n8n Chat');
		}
	}

	private async requireProductionThread(
		threadId: string,
		projectId: string,
		agentId: string,
		userId: string,
		sessionMode: AgentSessionMode = 'existing',
	): Promise<void> {
		if (
			!(await this.agentExecutionService.canUseProductionChatThread(
				threadId,
				projectId,
				agentId,
				userId,
				sessionMode,
			))
		)
			throw new NotFoundError('Session not found');
	}

	/** Preview counterpart of `requireProductionThread`: the thread must still be the user's preview chat. */
	private async requirePreviewThread(
		threadId: string,
		projectId: string,
		agentId: string,
		userId: string,
	): Promise<void> {
		if (
			!(await this.agentExecutionService.canUseDraftThread(threadId, projectId, agentId, userId, {
				previewChat: true,
				sessionMode: 'existing',
			}))
		)
			throw new NotFoundError(`Thread "${threadId}" not found`);
	}

	/**
	 * Enqueue a chat message and relay its execution to the browser stream.
	 * `accept` validates the request and stores attachments. It returns nothing after it sends its own error.
	 */
	private async relayQueuedMessage(
		res: FlushableResponse,
		accept: (
			send: (event: AgentSseEvent) => void,
			abortSignal: AbortSignal,
		) => Promise<Parameters<AgentMessageQueueService['enqueue']>[0] | undefined>,
	): Promise<void> {
		const delivery = initSseStream(res);
		const { send, abortSignal } = delivery;
		let accepted = false;
		let subscription: ReturnType<AgentQueuedPreviewStreamService['subscribe']> | undefined;
		let attachments: StoredAttachmentRef[] | undefined;
		try {
			const input = await accept(send, abortSignal);
			if (!input) return;
			attachments = input.payload.attachments;
			abortSignal.throwIfAborted();
			const result = await this.messageQueue.enqueue(input, (queueId) => {
				subscription = this.queuedPreviewStreams.subscribe(queueId, delivery);
			});
			if (result.status === 'duplicate') {
				send({ type: 'done' });
				return;
			}
			accepted = true;
			subscription?.accepted();
			send({ type: 'message-queued', queueId: result.item.id, sessionId: input.threadId });
			await subscription?.done;
		} catch (error) {
			send({
				type: 'error',
				message: error instanceof Error ? error.message : 'Chat failed',
				...(error instanceof AgentTurnAlreadyRunningError
					? { errorCode: 'turn_already_running' }
					: {}),
			});
		} finally {
			// Committed messages own their attachments, including after a disconnect.
			if (!accepted && attachments?.length) {
				await this.agentChatAttachmentService
					.deleteByIds(attachments.map((ref) => ref.id))
					.catch(() => {});
			}
			subscription?.close();
			delivery.close();
		}
	}

	private assertQueueId(queueId: string): void {
		if (!/^[1-9]\d*$/.test(queueId)) throw new BadRequestError('Invalid queue ID');
	}

	@Post('/:agentId/n8n-chat', { usesTemplates: true })
	@ProjectScope('agent:execute')
	async productionChat(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: FlushableResponse,
		@Param('agentId') agentId: string,
		@Body payload: AgentChatMessageDto,
	) {
		const { projectId } = req.params;
		const resourceId = productionChatMemoryResourceId(req.user.id);
		await this.relayQueuedMessage(res, async (send) => {
			if (!(await this.agentsService.isN8nChatPublished(agentId, projectId))) {
				send({
					type: 'error',
					message: 'This agent is not available in n8n Chat.',
					errorCode: 'agent_unavailable',
				});
				return undefined;
			}
			const sessionMode = payload.sessionId && !payload.newSession ? 'existing' : 'new';
			// Keep a client session ID for a new session, so a retry stays a duplicate.
			const threadId = payload.sessionId ?? randomUUID();
			await this.requireProductionThread(threadId, projectId, agentId, req.user.id, sessionMode);
			const attachments = await this.storeChatAttachments({
				attachments: payload.attachments,
				agentId,
				projectId,
				threadId,
				resourceId,
				source: N8N_CHAT_PRODUCTION_SOURCE,
			});
			return {
				agentId,
				projectId,
				threadId,
				sessionMode,
				source: N8N_CHAT_PRODUCTION_SOURCE,
				payload: {
					kind: 'n8n_chat',
					message: payload.message,
					messageId: payload.messageId,
					attachments,
					userId: req.user.id,
					resourceId,
				},
			};
		});
	}

	@Post('/:agentId/n8n-chat/resume', { usesTemplates: true })
	@ProjectScope('agent:execute')
	async productionChatResume(
		req: AuthenticatedRequest<{ projectId: string }>,
		res: FlushableResponse,
		@Param('agentId') agentId: string,
		@Body payload: AgentChatResumeDto,
	) {
		const execution = this.createChatExecution(res);
		const { send, onChunk, abortSignal, onExecutionStarted } = execution;
		let executionId: string | undefined;
		try {
			if (!(await this.agentsService.isN8nChatPublished(agentId, req.params.projectId))) {
				send({
					type: 'error',
					message: 'This agent is not available in n8n Chat.',
					errorCode: 'agent_unavailable',
				});
				return;
			}
			abortSignal.throwIfAborted();
			const stream = this.agentExecutionOrchestratorService.resumeForChat({
				agentId,
				projectId: req.params.projectId,
				runId: payload.runId,
				toolCallId: payload.toolCallId,
				resumeData: payload.resumeData,
				user: req.user,
				usePublishedVersion: true,
				integrationType: N8N_CHAT_INTEGRATION_TYPE,
				chatSurface: 'n8n-chat',
				expectedMemory: { resourceId: productionChatMemoryResourceId(req.user.id) },
				onExecutionStarted,
				onExecutionRecorded: (id) => {
					executionId = id;
				},
				abortSignal,
			});
			let suspended = false;
			let failed = false;
			for await (const chunk of stream) {
				onChunk(chunk);
				if (chunk.type === 'tool-call-suspended') suspended = true;
				if (chunk.type === 'error') failed = true;
			}
			if (!suspended && !failed) {
				send({ type: 'done', ...(executionId ? { executionId } : {}) });
			}
		} catch (error) {
			send({
				type: 'error',
				message: error instanceof Error ? error.message : 'Resume failed',
				...(error instanceof AgentTurnAlreadyRunningError
					? { errorCode: 'turn_already_running' }
					: {}),
			});
		} finally {
			execution.close();
		}
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
		const { message, sessionId, messageId, newSession, attachments } = payload;

		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			projectId,
			req.user,
			agentId,
		);

		await this.relayQueuedMessage(res, async (send, abortSignal) => {
			const prepared = await this.agentTestRunService.prepareDraftRun({
				agentId,
				projectId,
				user: req.user,
				sessionId,
				previewChat: true,
				newSession,
				credentialProvider,
			});
			if (abortSignal.aborted) return undefined;
			if (prepared.status === 'session_not_found') {
				send({ type: 'error', message: 'Session not found' });
				return undefined;
			}
			if (prepared.status === 'agent_misconfigured') {
				send({
					type: 'error',
					message: 'This agent is not ready to run yet.',
					errorCode: 'agent_misconfigured',
					missing: prepared.missing,
				});
				return undefined;
			}
			const threadId = prepared.sessionId;
			const resourceId = draftChatMemoryResourceId(req.user.id);
			return {
				agentId,
				projectId,
				threadId,
				sessionMode: prepared.sessionMode,
				source: 'chat',
				payload: {
					kind: 'preview',
					message,
					messageId,
					attachments: await this.storeChatAttachments({
						attachments,
						agentId,
						projectId,
						threadId,
						resourceId,
					}),
					userId: req.user.id,
					resourceId,
				},
			};
		});
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
				chatSurface: 'preview',
				errorMode: 'forward',
				onChunk,
				onBudgetNotice: () => send({ type: 'budget-notice', code: 'budget.alert' }),
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
			surface: 'preview',
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

	@Delete('/:agentId/n8n-chat/:threadId/executions/:executionId')
	@ProjectScope('agent:execute')
	async cancelProductionChatExecution(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('threadId') threadId: string,
		@Param('executionId') executionId: string,
	) {
		await this.requireProductionChat(agentId, req.params.projectId);
		await this.requireProductionThread(threadId, req.params.projectId, agentId, req.user.id);
		return {
			cancelRequested: await this.chatExecutionService.requestCancel({
				projectId: req.params.projectId,
				agentId,
				threadId,
				executionId,
				userId: req.user.id,
				surface: 'n8n-chat',
			}),
		};
	}

	@Delete('/:agentId/n8n-chat/runs/:runId')
	@ProjectScope('agent:execute')
	async cancelProductionChatRun(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('runId') runId: string,
	) {
		await this.requireProductionChat(agentId, req.params.projectId);
		return {
			cancelled: await this.agentExecutionOrchestratorService.cancelChatRun({
				agentId,
				runId,
				resourceId: productionChatMemoryResourceId(req.user.id),
			}),
		};
	}

	// The n8n Chat audience (`project:chatUser`) holds `agent:execute`, not
	// `agent:read` — this route must stay reachable to a chat-only member, so it
	// is scoped to `agent:execute`. `requireProductionThread` below (via
	// `canUseProductionChatThread` → `canUseTopLevelDraftThread`) still 404s a
	// thread that isn't this user's own, so the lower scope alone doesn't open
	// another user's history.
	@Get('/:agentId/n8n-chat/:threadId/messages')
	@ProjectScope('agent:execute')
	async getProductionChatMessages(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	): Promise<AgentChatMessagesResponse> {
		const { projectId, agentId, threadId } = req.params;
		await this.requireProductionChat(agentId, projectId);
		await this.requireProductionThread(threadId, projectId, agentId, req.user.id);
		const history = await this.agentExecutionOrchestratorService.getConversationHistory({
			threadId,
			projectId,
			agentId,
			userId: req.user.id,
		});
		if (!history) throw new NotFoundError('Session not found');
		const checkpoint = await this.agentsBuilderService.findOpenCheckpointForThread(
			agentId,
			threadId,
		);
		return {
			...withOpenSuspensions(
				history.messages,
				checkpoint?.persistence?.resourceId === productionChatMemoryResourceId(req.user.id)
					? checkpoint
					: null,
				{ appendInactiveCheckpointMessages: false },
			),
			activeExecutionId: history.activeExecutionId,
		};
	}

	// Same reasoning as `getProductionChatMessages`: the attachment's `resourceId`
	// check and `requireProductionThread` below already restrict this to the
	// requesting user's own thread, so `agent:execute` is safe for a chat-only member.
	@Get('/:agentId/n8n-chat/attachments/:attachmentId')
	@ProjectScope('agent:execute')
	async getProductionChatAttachment(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; attachmentId: string }>,
		res: Response,
	) {
		const { projectId, agentId, attachmentId } = req.params;
		await this.requireProductionChat(agentId, projectId);
		const attachment = await this.agentChatAttachmentService.getForAgent(attachmentId, {
			agentId,
			projectId,
			userId: req.user.id,
		});
		if (
			!attachment ||
			attachment.source !== N8N_CHAT_PRODUCTION_SOURCE ||
			attachment.resourceId !== productionChatMemoryResourceId(req.user.id)
		) {
			throw new NotFoundError(`Attachment "${attachmentId}" not found`);
		}
		await this.requireProductionThread(attachment.threadId, projectId, agentId, req.user.id);
		await this.streamAttachment(attachment, res);
	}

	// Same reasoning as `getProductionChatMessages`: `messageQueue.listPending`
	// calls `assertUserChatAccess`, which 404s a thread that isn't this user's
	// own, so `agent:execute` is safe for a chat-only member.
	@Get('/:agentId/n8n-chat/:threadId/queue')
	@ProjectScope('agent:execute')
	async getProductionQueuedMessages(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	): Promise<AgentChatQueueResponse> {
		await this.requireProductionChat(req.params.agentId, req.params.projectId);
		return await this.messageQueue.listPending({
			...req.params,
			userId: req.user.id,
			kind: 'n8n_chat',
		});
	}

	@Patch('/:agentId/n8n-chat/:threadId/queue/:queueId')
	@ProjectScope('agent:execute')
	async updateProductionQueuedMessage(
		req: AuthenticatedRequest<{
			projectId: string;
			agentId: string;
			threadId: string;
			queueId: string;
		}>,
		_res: Response,
		@Body payload: AgentChatQueueUpdateDto,
	): Promise<void> {
		this.assertQueueId(req.params.queueId);
		await this.requireProductionChat(req.params.agentId, req.params.projectId);
		await this.messageQueue.updatePending({
			...req.params,
			userId: req.user.id,
			message: payload.message,
			kind: 'n8n_chat',
		});
	}

	@Post('/:agentId/n8n-chat/:threadId/queue/:queueId/reorder')
	@ProjectScope('agent:execute')
	async reorderProductionQueuedMessage(
		req: AuthenticatedRequest<{
			projectId: string;
			agentId: string;
			threadId: string;
			queueId: string;
		}>,
		_res: Response,
		@Body payload: AgentChatQueueReorderDto,
	): Promise<void> {
		this.assertQueueId(req.params.queueId);
		await this.requireProductionChat(req.params.agentId, req.params.projectId);
		await this.messageQueue.reorderPending({
			...req.params,
			userId: req.user.id,
			targetQueueId: payload.targetQueueId,
			expectedQueueIds: payload.expectedQueueIds,
			kind: 'n8n_chat',
		});
	}

	@Post('/:agentId/n8n-chat/:threadId/queue/:queueId/steer')
	@ProjectScope('agent:execute')
	async steerProductionQueuedMessage(
		req: AuthenticatedRequest<{
			projectId: string;
			agentId: string;
			threadId: string;
			queueId: string;
		}>,
		_res: Response,
		@Body payload: AgentChatQueueSteerDto,
	): Promise<void> {
		this.assertQueueId(req.params.queueId);
		await this.requireProductionChat(req.params.agentId, req.params.projectId);
		await this.messageQueue.steer({
			...req.params,
			userId: req.user.id,
			executionId: payload.executionId,
			kind: 'n8n_chat',
		});
	}

	@Delete('/:agentId/n8n-chat/:threadId/queue/:queueId')
	@ProjectScope('agent:execute')
	async removeProductionQueuedMessage(
		req: AuthenticatedRequest<{
			projectId: string;
			agentId: string;
			threadId: string;
			queueId: string;
		}>,
	) {
		this.assertQueueId(req.params.queueId);
		await this.requireProductionChat(req.params.agentId, req.params.projectId);
		await this.messageQueue.removePending({ ...req.params, userId: req.user.id, kind: 'n8n_chat' });
		return { removed: true };
	}

	@Get('/:agentId/n8n-chat/:threadId/background-tasks')
	@ProjectScope('agent:execute')
	async getProductionBackgroundJobs(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	): Promise<AgentBackgroundJobsResponse> {
		const { projectId, agentId, threadId } = req.params;
		await this.requireProductionChat(agentId, projectId);
		const thread = await this.agentExecutionService.findThreadById(threadId);

		// A new n8n Chat session has no thread until its first execution starts.
		if (!thread) return { tasks: [] };

		await this.requireProductionThread(threadId, projectId, agentId, req.user.id);

		const jobs = await this.backgroundJobService.listCurrentGroupForThread(agentId, threadId);
		return this.mapBackgroundJobsToDto(jobs);
	}

	@Post('/:agentId/n8n-chat/:threadId/background-tasks/stop')
	@ProjectScope('agent:execute')
	async stopProductionBackgroundJobs(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	): Promise<AgentBackgroundJobsResponse> {
		const { projectId, agentId, threadId } = req.params;
		if (!this.agentsConfig.backgroundTasksEnabled)
			throw new BadRequestError('Background tasks are not enabled');
		await this.requireProductionChat(agentId, projectId);
		await this.requireProductionThread(threadId, projectId, agentId, req.user.id);
		await this.backgroundJobService.requestPause(
			agentId,
			threadId,
			productionChatMemoryResourceId(req.user.id),
		);
		const jobs = await this.backgroundJobService.listCurrentGroupForThread(agentId, threadId);
		return this.mapBackgroundJobsToDto(jobs);
	}

	@Post('/:agentId/n8n-chat/:threadId/background-tasks/resume')
	@ProjectScope('agent:execute')
	async resumeProductionBackgroundJob(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
		_res: Response,
		@Body payload: AgentChatResumeDto,
	) {
		const { projectId, agentId, threadId } = req.params;
		await this.requireProductionChat(agentId, projectId);
		const resumed = await this.agentExecutionOrchestratorService.resumeBackgroundForChat({
			...payload,
			resumeData: payload.resumeData,
			projectId,
			agentId,
			user: req.user,
			usePublishedVersion: true,
			chatSurface: 'n8n-chat',
			integrationType: N8N_CHAT_INTEGRATION_TYPE,
			expectedMemory: { threadId, resourceId: productionChatMemoryResourceId(req.user.id) },
		});
		if (!resumed) throw new BadRequestError('This background approval is no longer available');
		return { resumed };
	}

	@Delete('/:agentId/n8n-chat/:threadId')
	@ProjectScope('agent:execute')
	async deleteProductionChatThread(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Param('agentId') agentId: string,
		@Param('threadId') threadId: string,
	) {
		const { projectId } = req.params;
		await this.requireProductionChat(agentId, projectId);
		await this.requireProductionThread(threadId, projectId, agentId, req.user.id);
		const deleted = await this.agentExecutionService.deleteThread(
			projectId,
			agentId,
			threadId,
			req.user.id,
		);
		if (!deleted) throw new NotFoundError(`Thread "${threadId}" not found`);
		return { success: true };
	}

	@Get('/:agentId/chat/:threadId/queue')
	@ProjectScope('agent:read')
	async getQueuedMessages(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	): Promise<AgentChatQueueResponse> {
		const agent = await this.agentsService.findById(req.params.agentId, req.params.projectId);
		if (!agent) throw new NotFoundError('Agent not found');
		return await this.messageQueue.listPending({
			...req.params,
			userId: req.user.id,
			kind: 'preview',
		});
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
		this.assertQueueId(req.params.queueId);
		const agent = await this.agentsService.findById(req.params.agentId, req.params.projectId);
		if (!agent) throw new NotFoundError('Agent not found');
		await this.messageQueue.updatePending({
			...req.params,
			userId: req.user.id,
			message: payload.message,
			kind: 'preview',
		});
	}

	@Post('/:agentId/chat/:threadId/queue/:queueId/reorder')
	@ProjectScope('agent:execute')
	async reorderQueuedMessage(
		req: AuthenticatedRequest<{
			projectId: string;
			agentId: string;
			threadId: string;
			queueId: string;
		}>,
		_res: Response,
		@Body payload: AgentChatQueueReorderDto,
	): Promise<void> {
		this.assertQueueId(req.params.queueId);
		const agent = await this.agentsService.findById(req.params.agentId, req.params.projectId);
		if (!agent) throw new NotFoundError('Agent not found');
		await this.messageQueue.reorderPending({
			...req.params,
			userId: req.user.id,
			targetQueueId: payload.targetQueueId,
			expectedQueueIds: payload.expectedQueueIds,
			kind: 'preview',
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
		this.assertQueueId(req.params.queueId);
		const agent = await this.agentsService.findById(req.params.agentId, req.params.projectId);
		if (!agent) throw new NotFoundError('Agent not found');
		await this.messageQueue.removePending({ ...req.params, userId: req.user.id, kind: 'preview' });
		return { removed: true };
	}

	@Post('/:agentId/chat/:threadId/queue/:queueId/steer')
	@ProjectScope('agent:execute')
	async steerQueuedMessage(
		req: AuthenticatedRequest<{
			projectId: string;
			agentId: string;
			threadId: string;
			queueId: string;
		}>,
		_res: Response,
		@Body payload: AgentChatQueueSteerDto,
	): Promise<void> {
		this.assertQueueId(req.params.queueId);
		const agent = await this.agentsService.findById(req.params.agentId, req.params.projectId);
		if (!agent) throw new NotFoundError('Agent not found');
		await this.messageQueue.steer({
			...req.params,
			userId: req.user.id,
			executionId: payload.executionId,
			kind: 'preview',
		});
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
		if (thread.accessScope === 'user') {
			await this.requirePreviewThread(threadId, projectId, agentId, req.user.id);
		}

		const jobs = await this.backgroundJobService.listCurrentGroupForThread(agentId, threadId);
		return this.mapBackgroundJobsToDto(jobs);
	}

	private mapBackgroundJobsToDto(
		jobs: Awaited<ReturnType<AgentBackgroundJobService['listCurrentGroupForThread']>>,
	): AgentBackgroundJobsResponse {
		return {
			pendingTaskIds: jobs
				.filter(
					(job) =>
						job.status !== 'running' &&
						job.status !== 'suspended' &&
						job.status !== 'paused' &&
						!job.notifiedAt,
				)
				.map((job) => job.id),
			tasks: jobs.map((job) => ({
				id: job.id,
				title: scrubSecretsInText(job.title),
				kind: job.kind,
				status: job.status,
				...(job.pauseRequestId ? { pauseRequested: true } : {}),
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

	@Post('/:agentId/chat/:threadId/background-tasks/stop')
	@ProjectScope('agent:execute')
	async stopBackgroundJobs(
		req: AuthenticatedRequest<{ projectId: string; agentId: string; threadId: string }>,
	): Promise<AgentBackgroundJobsResponse> {
		const { projectId, agentId, threadId } = req.params;
		const agent = await this.agentsService.findById(agentId, projectId);
		if (!agent) throw new NotFoundError(`Agent "${agentId}" not found`);
		await this.requirePreviewThread(threadId, projectId, agentId, req.user.id);
		if (!this.agentsConfig.backgroundTasksEnabled)
			throw new BadRequestError('Background tasks are not enabled');
		await this.backgroundJobService.requestPause(
			agentId,
			threadId,
			draftChatMemoryResourceId(req.user.id),
		);
		return await this.getBackgroundJobs(req);
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
			chatSurface: 'preview',
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
		if (thread?.accessScope === 'user') {
			await this.requirePreviewThread(threadId, projectId, agentId, req.user.id);
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
		if (attachment.source === N8N_CHAT_PRODUCTION_SOURCE) {
			throw new NotFoundError(`Attachment "${attachmentId}" not found`);
		}
		await this.streamAttachment(attachment, res);
	}

	private async streamAttachment(attachment: AgentChatAttachment, res: Response) {
		const attachmentId = attachment.id;
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
