import {
	type AgentChatAttachmentPayload,
	AgentChatMessageDto,
	type AgentChatMessagesResponse,
	AgentChatResumeDto,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES,
	N8N_CHAT_INTEGRATION_TYPE,
	ViewableMimeTypes,
} from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Delete, Get, Param, Post, ProjectScope, RestController } from '@n8n/decorators';
import { sanitizeFilename } from '@n8n/utils/files/sanitize-filename';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import { getHtmlSandboxCSP } from 'n8n-core';

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
import { messagesToDto } from './agent-message-mapper';
import { type FlushableResponse, initSseStream, pumpChunks } from './agent-sse-stream';
import { AgentTestChatService, chatThreadId } from './agent-test-chat.service';
import { AgentValidationService } from './agent-validation.service';
import { AgentsService } from './agents.service';
import { AgentsBuilderService } from './builder/agents-builder.service';
import { draftChatMemoryResourceId } from './utils/agent-memory-scope';
import { resolveInboundMimeType } from './utils/inbound-attachments';
import { withOpenSuspensions } from './utils/messages-envelope';

@RestController('/projects/:projectId/agents/v2')
export class AgentChatController {
	constructor(
		private readonly agentExecutionOrchestratorService: AgentExecutionOrchestratorService,
		private readonly agentTestChatService: AgentTestChatService,
		private readonly agentValidationService: AgentValidationService,
		private readonly agentsBuilderService: AgentsBuilderService,
		private readonly credentialsService: CredentialsService,
		private readonly agentExecutionService: AgentExecutionService,
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
		for (const attachment of attachments) {
			const data = Buffer.from(attachment.data, 'base64');
			if (data.byteLength === 0 || data.byteLength > MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES) {
				throw new BadRequestError(`Attachment "${attachment.fileName}" exceeds the 10 MB limit`);
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
		const { message, sessionId, attachments } = payload;
		if (!message.trim() && !attachments?.length) {
			throw new BadRequestError('Message text or at least one attachment is required');
		}

		const credentialProvider = new AgentsCredentialProvider(
			this.credentialsService,
			projectId,
			req.user,
		);

		const { send } = initSseStream(res);

		// If the client supplied a sessionId and a thread already exists under that id,
		// the thread must belong to this (project, agent). Otherwise a caller could
		// append messages to another user's thread. A non-existent id is fine -
		// executeForChat will create the thread on first persisted message.
		if (sessionId) {
			const existing = await this.agentExecutionService.findThreadById(sessionId);
			if (existing && !threadBelongsTo(existing, projectId, agentId)) {
				send({ type: 'error', message: 'Session not found' });
				res.end();
				return;
			}
		}

		const threadId = sessionId ?? randomUUID();

		const { missing } = await this.agentValidationService.validateAgentIsRunnable(
			agentId,
			projectId,
			credentialProvider,
		);
		if (missing.length > 0) {
			send({
				type: 'error',
				message: 'This agent is not ready to run yet.',
				errorCode: 'agent_misconfigured',
				missing,
			});
			res.end();
			return;
		}

		try {
			const storedAttachments = await this.storeChatAttachments({
				attachments,
				agentId,
				projectId,
				threadId,
				resourceId: draftChatMemoryResourceId(req.user.id),
			});

			let executionId: string | undefined;
			const suspended = await pumpChunks(
				this.agentExecutionOrchestratorService.executeForChat({
					agentId,
					projectId,
					message,
					attachments: storedAttachments,
					user: req.user,
					memory: {
						threadId,
						resourceId: draftChatMemoryResourceId(req.user.id),
					},
					onExecutionRecorded: (id) => {
						executionId = id;
					},
				}),
				send,
			);
			if (!suspended) {
				send({ type: 'done', sessionId: threadId, ...(executionId ? { executionId } : {}) });
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Chat failed';
			send({ type: 'error', message: errorMessage });
		}

		res.end();
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
				}),
				send,
			);
			if (!suspended) {
				send({ type: 'done', ...(executionId ? { executionId } : {}) });
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Resume failed';
			send({ type: 'error', message: errorMessage });
		}

		res.end();
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
		let checkpoint = await this.agentsBuilderService.findOpenCheckpointForThread(agentId, threadId);
		if (!history) {
			if (checkpoint) return withOpenSuspensions([], checkpoint);
			throw new NotFoundError(`Thread "${threadId}" not found`);
		}
		if (!checkpoint) {
			checkpoint = await this.agentsBuilderService.findOpenCheckpointForThread(agentId, threadId, {
				includeUnscoped: true,
			});
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

		const stream = await this.agentChatAttachmentService.getStream(attachment);
		return await new Promise<void>((resolve, reject) => {
			stream.on('end', resolve);
			stream.on('error', reject);
			stream.pipe(res);
		});
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
