import {
	type AgentChatAttachmentPayload,
	AgentChatMessageDto,
	type AgentChatMessagesResponse,
	AgentChatResumeDto,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_MB,
	N8N_CHAT_INTEGRATION_TYPE,
	ViewableMimeTypes,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
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
import { messagesToDto } from './agent-message-mapper';
import { type FlushableResponse, initSseStream, pumpChunks } from './agent-sse-stream';
import { AgentTestChatService, chatThreadId } from './agent-test-chat.service';
import { AgentTestRunService } from './agent-test-run.service';
import { AgentsService } from './agents.service';
import { AgentsBuilderService } from './builder/agents-builder.service';
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
		const { message, sessionId, attachments } = payload;

		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			projectId,
			req.user,
		);

		const { send } = initSseStream(res);
		const abortController = new AbortController();
		const abortOnClose = () => abortController.abort();
		res.once('close', abortOnClose);
		let executionId: string | undefined;
		let storedAttachments: StoredAttachmentRef[] | undefined;
		try {
			const prepared = await this.agentTestRunService.prepareDraftRun({
				agentId,
				projectId,
				sessionId,
				credentialProvider,
			});
			if (abortController.signal.aborted) return;
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

			const suspended = await pumpChunks(
				this.agentTestRunService.streamDraftRun({
					agentId,
					projectId,
					message,
					attachments: storedAttachments,
					user: req.user,
					sessionId: threadId,
					onExecutionRecorded: (id) => {
						executionId = id;
					},
					abortSignal: abortController.signal,
				}),
				send,
			);
			if (!suspended) {
				send({ type: 'done', sessionId: threadId, ...(executionId ? { executionId } : {}) });
			}
		} catch (error) {
			// No execution recorded means nothing references this turn's attachments —
			// remove them so failed turns can't accumulate orphans. Best-effort, and
			// deliberately also on aborted turns.
			if (!executionId && storedAttachments?.length) {
				await this.agentChatAttachmentService
					.deleteByIds(storedAttachments.map((ref) => ref.id))
					.catch(() => {});
			}
			if (!abortController.signal.aborted) {
				const errorMessage = error instanceof Error ? error.message : 'Chat failed';
				send({ type: 'error', message: errorMessage });
			}
		} finally {
			res.off('close', abortOnClose);
			res.end();
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
		const { send } = initSseStream(res);

		const abortController = new AbortController();
		const abortOnClose = () => abortController.abort();
		res.once('close', abortOnClose);
		try {
			let executionId: string | undefined;
			const suspended = await pumpChunks(
				this.agentExecutionOrchestratorService.resumeForChat({
					agentId,
					projectId,
					runId,
					toolCallId,
					resumeData,
					user: req.user,
					usePublishedVersion: false,
					integrationType: N8N_CHAT_INTEGRATION_TYPE,
					onExecutionRecorded: (id) => {
						executionId = id;
					},
					abortSignal: abortController.signal,
				}),
				send,
			);
			if (!suspended) {
				send({ type: 'done', ...(executionId ? { executionId } : {}) });
			}
		} catch (error) {
			if (!abortController.signal.aborted) {
				const errorMessage = error instanceof Error ? error.message : 'Resume failed';
				send({ type: 'error', message: errorMessage });
			}
		} finally {
			res.off('close', abortOnClose);
			res.end();
		}
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
