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
import { posix } from 'node:path';
import { FileNotFoundError, getHtmlSandboxCSP } from 'n8n-core';

import { sendStreamToResponse } from '@/response-helper';

import { AgentChatAttachmentService, AgentFileLimitError } from './agent-chat-attachment.service';
import { AgentMessageQueueService } from './agent-message-queue.service';
import { AgentQueuedTestStreamService } from './agent-queued-test-stream.service';
import { type FlushableResponse, initSseStream, toChatErrorEvent } from './agent-sse-stream';
import type { AgentChatAttachment } from './entities/agent-chat-attachment.entity';
import { busyEvent } from './queue/agent-busy-event';
import { AgentTurnGate } from './queue/agent-turn-gate.service';
import { AgentTurnPlacement } from './queue/agent-turn-placement.service';
import type { StoredAttachmentRef } from './types/agent-chat-attachment';
import { resolveInboundMimeType } from './utils/inbound-attachments';

/** The SSE stream of one chat request, with the helpers that the chat routes use. */
export type AgentChatStream = ReturnType<AgentChatRelayService['createChatStream']>;

/**
 * Request plumbing shared by the Agents chat controllers: SSE delivery of a
 * queued message, inbound attachment storage and attachment downloads.
 */
@Service()
export class AgentChatRelayService {
	constructor(
		private readonly messageQueue: AgentMessageQueueService,
		private readonly queuedPreviewStreams: AgentQueuedTestStreamService,
		private readonly agentChatAttachmentService: AgentChatAttachmentService,
		private readonly placement: AgentTurnPlacement,
		private readonly gate: AgentTurnGate,
	) {}

	createChatStream(res: FlushableResponse) {
		const delivery = initSseStream(res);
		return {
			send: delivery.send,
			onExecutionStarted: (id: string, sessionId: string, inputMessageIds: string[]) => {
				delivery.send({ type: 'execution-started', executionId: id, sessionId, inputMessageIds });
			},
			onChunk: delivery.onChunk,
			close: delivery.close,
		};
	}

	/** Stream a resume to the client. A thrown error becomes an error event, and the stream always closes. */
	async relayResume(
		res: FlushableResponse,
		resume: (stream: AgentChatStream) => Promise<void>,
	): Promise<void> {
		const stream = this.createChatStream(res);
		try {
			await resume(stream);
		} catch (error) {
			stream.send(toChatErrorEvent(error, 'Resume failed'));
		} finally {
			stream.close();
		}
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
				const row = await this.agentChatAttachmentService
					.storeInbound({
						agentId,
						projectId,
						threadId,
						resourceId,
						source,
						fileName: attachment.fileName,
						mimeType,
						data,
					})
					.catch((error: unknown) => {
						throw error instanceof AgentFileLimitError ? new BadRequestError(error.message) : error;
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
	 *
	 * Only `N8N_AGENTS_MAIN_MAX_INTAKE` messages run `accept` and the enqueue at
	 * the same time. Other messages wait for a place, and get a `main_busy`
	 * error when no place is free in time. The message is then not saved.
	 *
	 * A message gets a `queue_full` error when `N8N_AGENTS_QUEUE_MAX_WAITING`
	 * turns already wait: in the agent queue for a message that goes to an
	 * agent worker, else on this main. It is not saved either.
	 *
	 * When the memory of this main is high, or it has `N8N_AGENTS_MAIN_MAX_STREAMS`
	 * live streams, the message is accepted but the stream closes right after
	 * `message-queued`. The client then loads the reply from the recorded
	 * history, as it does after a lost stream.
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
		let subscription: ReturnType<AgentQueuedTestStreamService['subscribe']> | undefined;
		let attachments: StoredAttachmentRef[] | undefined;
		let leaveIntake: (() => void) | undefined;
		let closeStream: (() => void) | undefined;
		try {
			leaveIntake = await this.gate.enterIntake(abortSignal);
			if (!leaveIntake) {
				if (!abortSignal.aborted) {
					send(busyEvent('main-at-limit', await this.placement.retryAfterSeconds()));
				}
				return;
			}
			const input = await accept(send, abortSignal);
			if (!input) return;
			attachments = input.payload.attachments;
			abortSignal.throwIfAborted();
			const toWorker = await this.placement.goesToWorker(input.payload.kind);
			if (await this.placement.queueFull(toWorker)) {
				send(busyEvent('queue-full', await this.placement.retryAfterSeconds()));
				return;
			}
			closeStream = this.gate.openStream();
			const result = await this.messageQueue.enqueue(input, (queueId) => {
				if (closeStream) subscription = this.queuedPreviewStreams.subscribe(queueId, delivery);
			});
			// The message is in the queue. Waiting for the reply costs this main no intake work.
			leaveIntake();
			if (result.status === 'duplicate') {
				send({ type: 'done' });
				return;
			}
			accepted = true;
			subscription?.accepted();
			send({ type: 'message-queued', queueId: result.item.id, sessionId: input.threadId });
			await subscription?.done;
		} catch (error) {
			send(toChatErrorEvent(error, 'Chat failed'));
		} finally {
			leaveIntake?.();
			closeStream?.();
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

	/** Subscribe before the transaction commits so the report cannot outrun the browser. */
	async relayQueuedStop(
		res: FlushableResponse,
		threadId: string,
		request: (onQueued: (id: string) => void) => Promise<unknown>,
	) {
		const delivery = initSseStream(res);
		let queueId: string | undefined;
		let subscription: ReturnType<AgentQueuedTestStreamService['subscribe']> | undefined;

		try {
			await request((id) => {
				queueId = id;
				subscription = this.queuedPreviewStreams.subscribe(id, delivery);
			});

			if (subscription && queueId) {
				subscription.accepted();
				delivery.send({ type: 'message-queued', queueId, sessionId: threadId });
				await subscription.done;
			} else delivery.send({ type: 'done', sessionId: threadId });
		} catch (error) {
			delivery.send(toChatErrorEvent(error, 'Stop failed'));
		} finally {
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

		await sendStreamToResponse(res, stream, () => {
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
					`attachment; filename="${sanitizeFilename(posix.basename(attachment.fileName))}"`,
				);
			}
		});
	}
}
