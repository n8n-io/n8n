import type {
	ChatHubMessageStatus,
	ChatMessageId,
	ChatSessionId,
	ChatStreamBegin,
	ChatStreamChunk,
	ChatStreamEnd,
	ChatStreamError,
	ChatStreamPushMessage,
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
	/** Push reference for WebSocket connection (user-initiated) */
	pushRef?: string;
	/** User ID for server-initiated messages (when no pushRef available) */
	userId?: string;
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
 * Handles both user-initiated streams (with pushRef) and server-initiated streams (with userId).
 * In multi-main mode, relays events via Redis pub/sub to reach the correct main instance.
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
			pushRef: params.pushRef,
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
			{ pushRef: streamState.pushRef, userId: streamState.userId, sessionId, messageId },
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
			{ pushRef: streamState.pushRef, userId: streamState.userId, sessionId, messageId },
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
			{ pushRef: streamState.pushRef, userId: streamState.userId, sessionId, messageId },
			message,
			'error',
		);

		// Clean up the stream state
		await this.sessionStore.endStream(sessionId);
	}

	/**
	 * Update the pushRef for a session (used during reconnection)
	 */
	async updatePushRef(sessionId: ChatSessionId, pushRef: string): Promise<void> {
		await this.sessionStore.updatePushRef(sessionId, pushRef);
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
		pushRef: string;
		userId?: string;
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
		// Only handle if we have the pushRef locally
		if (payload.pushRef && !this.push.hasPushRef(payload.pushRef)) {
			return;
		}

		const { eventType, sessionId, messageId, sequenceNumber } = payload;
		const timestamp = Date.now();

		let message: ChatStreamPushMessage;

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

		// Send directly via push since we already verified we have the connection
		if (payload.pushRef) {
			this.push.send(message, payload.pushRef);
		} else if (payload.userId) {
			this.push.sendToUsers(message, [payload.userId]);
		}
	}

	/**
	 * Send a push message, either directly or via relay depending on instance topology
	 */
	private async sendPushMessage(
		params: Pick<StartStreamParams, 'pushRef' | 'userId' | 'sessionId' | 'messageId'>,
		message: ChatStreamPushMessage,
		eventType: 'begin' | 'chunk' | 'end' | 'error',
	): Promise<void> {
		const { pushRef, userId } = params;

		// Try direct push first if we have a pushRef and it's local
		if (pushRef && this.push.hasPushRef(pushRef)) {
			this.push.send(message, pushRef);
			return;
		}

		// Try sending to user if no pushRef (server-initiated)
		if (!pushRef && userId) {
			this.push.sendToUsers(message, [userId]);
			return;
		}

		// Need to relay via pub/sub in multi-main mode
		if (this.shouldRelayViaPubSub()) {
			await this.relayViaPubSub(params, message, eventType);
			return;
		}

		// Single-main mode but pushRef not found - might be disconnected
		if (pushRef) {
			this.logger.debug(`PushRef ${pushRef} not found locally, client may be disconnected`);
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
		params: Pick<StartStreamParams, 'pushRef' | 'userId' | 'sessionId' | 'messageId'>,
		message: ChatStreamPushMessage,
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
				pushRef: params.pushRef ?? '',
				userId: params.userId,
				sessionId: params.sessionId,
				messageId: params.messageId,
				sequenceNumber: message.data.sequenceNumber,
				payload,
			},
		});
	}
}
