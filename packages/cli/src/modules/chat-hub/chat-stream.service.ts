import type {
	ChatAttachmentInfo,
	ChatHubMessageStatus,
	ChatHumanMessageCreated,
	ChatMessageEdited,
	ChatMessageId,
	ChatSessionId,
	ChatStreamBegin,
	ChatStreamChunk,
	ChatStreamEnd,
	ChatStreamError,
	ChatStreamEvent,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { Push } from '@/push';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { ChatSessionStoreService } from './chat-session-store.service';

/**
 * Parameters for starting a new stream
 */
export interface StartStreamParams {
	/** User ID - required for sending to all user connections */
	userId: string;
	/** Chat session ID */
	sessionId: ChatSessionId;
	/** AI message ID being streamed */
	messageId: ChatMessageId;
	/** Previous message ID */
	previousMessageId: ChatMessageId | null;
	/** Retry of message ID if applicable */
	retryOfMessageId: ChatMessageId | null;
	/** Execution ID if applicable */
	executionId: number | null;
}

/**
 * Service responsible for streaming chat messages to clients via WebSocket.
 * Sends to all user connections so multiple browser windows receive updates.
 * In multi-main mode, relays events via Redis pub/sub to reach all main instances.
 */
@Service()
export class ChatStreamService {
	constructor(
		private readonly logger: Logger,
		private readonly push: Push,
		private readonly publisher: Publisher,
		private readonly instanceSettings: InstanceSettings,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly sessionStore: ChatSessionStoreService,
	) {
		this.logger = this.logger.scoped('scaling');
	}

	/**
	 * Start a new stream for a message
	 */
	async startStream(params: StartStreamParams): Promise<void> {
		const { sessionId, messageId, previousMessageId, retryOfMessageId, executionId } = params;

		// Register the stream in the session store
		await this.sessionStore.startStream({
			sessionId,
			messageId,
			userId: params.userId,
		});

		const message: ChatStreamBegin = {
			type: 'chatStreamBegin',
			data: {
				sessionId,
				messageId,
				sequenceNumber: 0,
				timestamp: Date.now(),
				previousMessageId,
				retryOfMessageId,
				executionId,
			},
		};

		await this.sendPushMessage(params, message, 'begin');
	}

	/**
	 * Send a content chunk for an ongoing stream
	 */
	async sendChunk(
		sessionId: ChatSessionId,
		messageId: ChatMessageId,
		content: string,
	): Promise<void> {
		const streamState = await this.sessionStore.getStreamState(sessionId);
		if (!streamState || streamState.messageId !== messageId) {
			this.logger.warn(`No active stream found for session ${sessionId} message ${messageId}`);
			return;
		}

		const sequenceNumber = await this.sessionStore.incrementSequence(sessionId);

		// Buffer the chunk for reconnection replay
		await this.sessionStore.bufferChunk(sessionId, { sequenceNumber, content });

		const message: ChatStreamChunk = {
			type: 'chatStreamChunk',
			data: {
				sessionId,
				messageId,
				sequenceNumber,
				timestamp: Date.now(),
				content,
			},
		};

		await this.sendPushMessage(
			{ userId: streamState.userId, sessionId, messageId },
			message,
			'chunk',
		);
	}

	/**
	 * End a stream successfully
	 */
	async endStream(
		sessionId: ChatSessionId,
		messageId: ChatMessageId,
		status: ChatHubMessageStatus,
	): Promise<void> {
		const streamState = await this.sessionStore.getStreamState(sessionId);
		if (!streamState || streamState.messageId !== messageId) {
			this.logger.warn(`No active stream found for session ${sessionId} message ${messageId}`);
			return;
		}

		const sequenceNumber = await this.sessionStore.incrementSequence(sessionId);

		const message: ChatStreamEnd = {
			type: 'chatStreamEnd',
			data: {
				sessionId,
				messageId,
				sequenceNumber,
				timestamp: Date.now(),
				status,
			},
		};

		await this.sendPushMessage(
			{ userId: streamState.userId, sessionId, messageId },
			message,
			'end',
		);

		// Clean up the stream state
		await this.sessionStore.endStream(sessionId);
	}

	/**
	 * Send an error for a stream
	 */
	async sendError(
		sessionId: ChatSessionId,
		messageId: ChatMessageId,
		error: string,
	): Promise<void> {
		const streamState = await this.sessionStore.getStreamState(sessionId);
		if (!streamState || streamState.messageId !== messageId) {
			this.logger.warn(`No active stream found for session ${sessionId} message ${messageId}`);
			return;
		}

		const sequenceNumber = await this.sessionStore.incrementSequence(sessionId);

		const message: ChatStreamError = {
			type: 'chatStreamError',
			data: {
				sessionId,
				messageId,
				sequenceNumber,
				timestamp: Date.now(),
				error,
			},
		};

		await this.sendPushMessage(
			{ userId: streamState.userId, sessionId, messageId },
			message,
			'error',
		);

		// Clean up the stream state
		await this.sessionStore.endStream(sessionId);
	}

	/**
	 * Get pending chunks for reconnection replay
	 */
	async getPendingChunks(
		sessionId: ChatSessionId,
		lastReceivedSequence: number,
	): Promise<Array<{ sequenceNumber: number; content: string }>> {
		return await this.sessionStore.getChunksAfter(sessionId, lastReceivedSequence);
	}

	/**
	 * Check if there is an active stream for a session
	 */
	async hasActiveStream(sessionId: ChatSessionId): Promise<boolean> {
		const streamState = await this.sessionStore.getStreamState(sessionId);
		return streamState !== null;
	}

	/**
	 * Get the current message ID being streamed for a session
	 */
	async getCurrentMessageId(sessionId: ChatSessionId): Promise<ChatMessageId | null> {
		const streamState = await this.sessionStore.getStreamState(sessionId);
		return streamState?.messageId ?? null;
	}

	/**
	 * Handle relay events from other main instances (multi-main mode)
	 */
	@OnPubSubEvent('relay-chat-stream-event', { instanceType: 'main' })
	handleRelayChatStreamEvent(payload: {
		eventType: 'begin' | 'chunk' | 'end' | 'error';
		userId: string;
		sessionId: string;
		messageId: string;
		sequenceNumber: number;
		payload: {
			previousMessageId?: string | null;
			retryOfMessageId?: string | null;
			executionId?: number | null;
			content?: string;
			status?: string;
			error?: string;
		};
	}): void {
		const { eventType, userId, sessionId, messageId, sequenceNumber } = payload;
		const timestamp = Date.now();

		let message: ChatStreamEvent;

		switch (eventType) {
			case 'begin':
				message = {
					type: 'chatStreamBegin',
					data: {
						sessionId,
						messageId,
						sequenceNumber,
						timestamp,
						previousMessageId: payload.payload.previousMessageId ?? null,
						retryOfMessageId: payload.payload.retryOfMessageId ?? null,
						executionId: payload.payload.executionId ?? null,
					},
				};
				break;
			case 'chunk':
				message = {
					type: 'chatStreamChunk',
					data: {
						sessionId,
						messageId,
						sequenceNumber,
						timestamp,
						content: payload.payload.content ?? '',
					},
				};
				break;
			case 'end':
				message = {
					type: 'chatStreamEnd',
					data: {
						sessionId,
						messageId,
						sequenceNumber,
						timestamp,
						status: (payload.payload.status as ChatHubMessageStatus) ?? 'success',
					},
				};
				break;
			case 'error':
				message = {
					type: 'chatStreamError',
					data: {
						sessionId,
						messageId,
						sequenceNumber,
						timestamp,
						error: payload.payload.error ?? 'Unknown error',
					},
				};
				break;
		}

		// Send to all user connections
		this.push.sendToUsers(message, [userId]);
	}

	/**
	 * Send a push message, either directly or via relay depending on instance topology.
	 * Always sends to ALL user connections so multiple browser windows receive updates.
	 */
	private async sendPushMessage(
		params: Pick<StartStreamParams, 'userId' | 'sessionId' | 'messageId'>,
		message: ChatStreamEvent,
		eventType: 'begin' | 'chunk' | 'end' | 'error',
	): Promise<void> {
		const { userId } = params;

		// Send to ALL user connections so all browser windows receive updates
		this.push.sendToUsers(message, [userId]);

		// In multi-main mode, also relay to other instances
		if (this.shouldRelayViaPubSub()) {
			await this.relayViaPubSub(params, message, eventType);
		}
	}

	/**
	 * Check if we should relay messages via pub/sub
	 */
	private shouldRelayViaPubSub(): boolean {
		return this.instanceSettings.isMultiMain || this.executionsConfig.mode === 'queue';
	}

	/**
	 * Relay a message via Redis pub/sub for multi-main coordination
	 */
	private async relayViaPubSub(
		params: Pick<StartStreamParams, 'userId' | 'sessionId' | 'messageId'>,
		message: ChatStreamEvent,
		eventType: 'begin' | 'chunk' | 'end' | 'error',
	): Promise<void> {
		const payload: Record<string, unknown> = {};

		switch (message.type) {
			case 'chatStreamBegin':
				payload.previousMessageId = message.data.previousMessageId;
				payload.retryOfMessageId = message.data.retryOfMessageId;
				payload.executionId = message.data.executionId;
				break;
			case 'chatStreamChunk':
				payload.content = message.data.content;
				break;
			case 'chatStreamEnd':
				payload.status = message.data.status;
				break;
			case 'chatStreamError':
				payload.error = message.data.error;
				break;
		}

		await this.publisher.publishCommand({
			command: 'relay-chat-stream-event',
			payload: {
				eventType,
				userId: params.userId,
				sessionId: params.sessionId,
				messageId: params.messageId,
				sequenceNumber: message.data.sequenceNumber,
				payload,
			},
		});
	}

	/**
	 * Broadcast a human message to all user connections (for cross-client sync)
	 */
	async sendHumanMessage(params: {
		userId: string;
		sessionId: ChatSessionId;
		messageId: ChatMessageId;
		previousMessageId: ChatMessageId | null;
		content: string;
		attachments: ChatAttachmentInfo[];
	}): Promise<void> {
		const message: ChatHumanMessageCreated = {
			type: 'chatHumanMessageCreated',
			data: {
				sessionId: params.sessionId,
				messageId: params.messageId,
				previousMessageId: params.previousMessageId,
				content: params.content,
				attachments: params.attachments,
				timestamp: Date.now(),
			},
		};

		this.push.sendToUsers(message, [params.userId]);

		if (this.shouldRelayViaPubSub()) {
			await this.relayHumanMessageViaPubSub(params, message);
		}
	}

	/**
	 * Broadcast a message edit to all user connections (for cross-client sync)
	 */
	async sendMessageEdit(params: {
		userId: string;
		sessionId: ChatSessionId;
		originalMessageId: ChatMessageId;
		newMessageId: ChatMessageId;
		content: string;
		attachments: ChatAttachmentInfo[];
	}): Promise<void> {
		const message: ChatMessageEdited = {
			type: 'chatMessageEdited',
			data: {
				sessionId: params.sessionId,
				originalMessageId: params.originalMessageId,
				newMessageId: params.newMessageId,
				content: params.content,
				attachments: params.attachments,
				timestamp: Date.now(),
			},
		};

		this.push.sendToUsers(message, [params.userId]);

		if (this.shouldRelayViaPubSub()) {
			await this.relayMessageEditViaPubSub(params, message);
		}
	}

	/**
	 * Relay human message via Redis pub/sub for multi-main coordination
	 */
	private async relayHumanMessageViaPubSub(
		params: {
			userId: string;
			sessionId: ChatSessionId;
			messageId: ChatMessageId;
			previousMessageId: ChatMessageId | null;
			content: string;
			attachments: ChatAttachmentInfo[];
		},
		_message: ChatHumanMessageCreated,
	): Promise<void> {
		await this.publisher.publishCommand({
			command: 'relay-chat-human-message',
			payload: {
				userId: params.userId,
				sessionId: params.sessionId,
				messageId: params.messageId,
				previousMessageId: params.previousMessageId,
				content: params.content,
				attachments: params.attachments,
			},
		});
	}

	/**
	 * Relay message edit via Redis pub/sub for multi-main coordination
	 */
	private async relayMessageEditViaPubSub(
		params: {
			userId: string;
			sessionId: ChatSessionId;
			originalMessageId: ChatMessageId;
			newMessageId: ChatMessageId;
			content: string;
			attachments: ChatAttachmentInfo[];
		},
		_message: ChatMessageEdited,
	): Promise<void> {
		await this.publisher.publishCommand({
			command: 'relay-chat-message-edit',
			payload: {
				userId: params.userId,
				sessionId: params.sessionId,
				originalMessageId: params.originalMessageId,
				newMessageId: params.newMessageId,
				content: params.content,
				attachments: params.attachments,
			},
		});
	}

	/**
	 * Handle relay events for human messages from other main instances
	 */
	@OnPubSubEvent('relay-chat-human-message', { instanceType: 'main' })
	handleRelayChatHumanMessage(payload: {
		userId: string;
		sessionId: string;
		messageId: string;
		previousMessageId: string | null;
		content: string;
		attachments: Array<{ id: string; fileName: string; mimeType: string }>;
	}): void {
		const message: ChatHumanMessageCreated = {
			type: 'chatHumanMessageCreated',
			data: {
				sessionId: payload.sessionId,
				messageId: payload.messageId,
				previousMessageId: payload.previousMessageId,
				content: payload.content,
				attachments: payload.attachments,
				timestamp: Date.now(),
			},
		};

		this.push.sendToUsers(message, [payload.userId]);
	}

	/**
	 * Handle relay events for message edits from other main instances
	 */
	@OnPubSubEvent('relay-chat-message-edit', { instanceType: 'main' })
	handleRelayChatMessageEdit(payload: {
		userId: string;
		sessionId: string;
		originalMessageId: string;
		newMessageId: string;
		content: string;
		attachments: Array<{ id: string; fileName: string; mimeType: string }>;
	}): void {
		const message: ChatMessageEdited = {
			type: 'chatMessageEdited',
			data: {
				sessionId: payload.sessionId,
				originalMessageId: payload.originalMessageId,
				newMessageId: payload.newMessageId,
				content: payload.content,
				attachments: payload.attachments,
				timestamp: Date.now(),
			},
		};

		this.push.sendToUsers(message, [payload.userId]);
	}
}
