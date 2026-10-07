import {
	type AgentChatAttachmentPayload,
	type AgentSseEvent,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES,
	MAX_AGENT_CHAT_ATTACHMENT_SIZE_MB,
	ViewableMimeTypes,
} from '@n8n/api-types';
import { Service } from '@n8n/di';
import { BadRequestError, NotFoundError } from '@n8n/errors';
import { sanitizeFilename } from '@n8n/utils/files/sanitize-filename';
import type { Response } from 'express';
import { FileNotFoundError, getHtmlSandboxCSP } from 'n8n-core';
import { pipeline } from 'node:stream/promises';

import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import { AgentTurnAlreadyRunningError } from './agent-chat-execution.service';
import { AgentMessageQueueService } from './agent-message-queue.service';
import { AgentQueuedPreviewStreamService } from './agent-queued-preview-stream.service';
import { type FlushableResponse, initSseStream } from './agent-sse-stream';
import type { AgentChatAttachment } from './entities/agent-chat-attachment.entity';
import type { StoredAttachmentRef } from './types/agent-chat-attachment';
import { resolveInboundMimeType } from './utils/inbound-attachments';

/**
 * Request plumbing shared by the Agents chat controllers: SSE delivery of a
 * queued message, inbound attachment storage and attachment downloads.
 */
@Service()
export class AgentChatRelayService {
	constructor(
		private readonly messageQueue: AgentMessageQueueService,
		private readonly queuedPreviewStreams: AgentQueuedPreviewStreamService,
		private readonly agentChatAttachmentService: AgentChatAttachmentService,
	) {}

	createChatExecution(res: FlushableResponse) {
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
	async storeChatAttachments(params: {
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

	/**
	 * Enqueue a chat message and relay its execution to the browser stream.
	 * `accept` validates the request and stores attachments. It returns nothing after it sends its own error.
	 */
	async relayQueuedMessage(
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

	async streamAttachment(attachment: AgentChatAttachment, res: Response) {
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
}
