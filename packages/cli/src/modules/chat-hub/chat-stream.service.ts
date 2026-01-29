import type {
	ChatHubAttachmentInfo,
	ChatHubExecutionBegin,
	ChatHubExecutionEnd,
	ChatHubMessageStatus,
	ChatHubHumanMessageCreated,
	ChatHubMessageEdited,
	ChatMessageId,
	ChatSessionId,
	ChatHubStreamBegin,
	ChatHubStreamChunk,
	ChatHubStreamEnd,
	ChatHubStreamError,
	ChatHubStreamEvent,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { ChatStreamStateService } from './chat-stream-state.service';

import { Push } from '@/push';
import { Publisher } from '@/scaling/pubsub/publisher.service';

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
		private readonly streamStore: ChatStreamStateService,
	) {
		this.logger = this.logger.scoped('chat-hub');
	}

	/**
	 * Start a chat execution (can contain multiple messages, e.g., with tool calls)
	 */
	async startExecution(userId: string, sessionId: ChatSessionId): Promise<void> {
		await this.streamStore.startExecution({
			sessionId,
			userId,
		});

		const message: ChatHubExecutionBegin = {
			type: 'chatHubExecutionBegin',
			data: {
				sessionId,
				timestamp: Date.now(),
			},
		};

		this.push.sendToUsers(message, [userId]);

		if (this.shouldRelayViaPubSub()) {
			await this.publisher.publishCommand({
				command: 'relay-chat-stream-event',
				payload: {
					eventType: 'execution-begin',
					userId,
					sessionId,
					messageId: '',
					sequenceNumber: 0,
					payload: {},
				},
			});
		}
	}

	/**
	 * End a chat execution
	 */
	async endExecution(
		userId: string,
		sessionId: ChatSessionId,
		status: 'success' | 'error' | 'cancelled',
	): Promise<void> {
		const message: ChatHubExecutionEnd = {
			type: 'chatHubExecutionEnd',
			data: {
				sessionId,
				status,
				timestamp: Date.now(),
			},
		};

		this.push.sendToUsers(message, [userId]);

		if (this.shouldRelayViaPubSub()) {
			await this.publisher.publishCommand({
				command: 'relay-chat-stream-event',
				payload: {
					eventType: 'execution-end',
					userId,
					sessionId,
					messageId: '',
					sequenceNumber: 0,
					payload: { status },
				},
			});
		}

		// Clean up the session state
		await this.streamStore.endExecution(sessionId);
	}

	/**
	 * Start a new message stream within an execution
	 */
	async startStream(params: StartStreamParams): Promise<void> {
		const { sessionId, messageId, previousMessageId, retryOfMessageId, executionId } = params;

		// Update the current message ID in the session store
		await this.streamStore.setCurrentMessage(sessionId, messageId);

		const message: ChatHubStreamBegin = {
			type: 'chatHubStreamBegin',
			data: {
				sessionId,
				messageId,
				sequenceNumber: await this.streamStore.incrementSequence(sessionId),
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
		const streamState = await this.streamStore.getStreamState(sessionId);
		if (!streamState) {
			this.logger.debug(`No active execution found for session ${sessionId}`);
			return;
		}

		const sequenceNumber = await this.streamStore.incrementSequence(sessionId);

		// Buffer the chunk for reconnection replay
		await this.streamStore.bufferChunk(sessionId, { sequenceNumber, content });
		const message: ChatHubStreamChunk = {
			type: 'chatHubStreamChunk',
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
	 * End a message stream (but keep execution state for potential follow-up messages)
	 */
	async endStream(
		sessionId: ChatSessionId,
		messageId: ChatMessageId,
		status: ChatHubMessageStatus,
	): Promise<void> {
		const streamState = await this.streamStore.getStreamState(sessionId);
		if (!streamState) {
			this.logger.debug(`No active execution found for session ${sessionId}`);
			return;
		}

		const sequenceNumber = await this.streamStore.incrementSequence(sessionId);

		const message: ChatHubStreamEnd = {
			type: 'chatHubStreamEnd',
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

		// Don't clean up session state here - there may be more messages coming
		// (e.g., tool call responses). State is cleaned up by endExecution().
	}

	/**
	 * Send an error for a message stream
	 */
	async sendError(
		sessionId: ChatSessionId,
		messageId: ChatMessageId,
		error: string,
	): Promise<void> {
		const streamState = await this.streamStore.getStreamState(sessionId);
		if (!streamState) {
			this.logger.debug(`No active execution found for session ${sessionId}`);
			return;
		}

		const sequenceNumber = await this.streamStore.incrementSequence(sessionId);

		const message: ChatHubStreamError = {
			type: 'chatHubStreamError',
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

		// Don't clean up session state here - endExecution() handles that
	}

	/**
	 * Send an error directly via Push without requiring stream state.
	 * Used for errors that occur before streaming starts.
	 */
	async sendErrorDirect(
		userId: string,
		sessionId: ChatSessionId,
		messageId: ChatMessageId,
		error: string,
	): Promise<void> {
		const message: ChatHubStreamError = {
			type: 'chatHubStreamError',
			data: {
				sessionId,
				messageId,
				sequenceNumber: 0,
				timestamp: Date.now(),
				error,
			},
		};
		this.push.sendToUsers(message, [userId]);

		if (this.shouldRelayViaPubSub()) {
			await this.publisher.publishCommand({
				command: 'relay-chat-stream-event',
				payload: {
					eventType: 'error',
					userId,
					sessionId,
					messageId,
					sequenceNumber: 0,
					payload: { error },
				},
			});
		}
	}

	/**
	 * Get pending chunks for reconnection replay
	 */
	async getPendingChunks(
		sessionId: ChatSessionId,
		lastReceivedSequence: number,
	): Promise<Array<{ sequenceNumber: number; content: string }>> {
		return await this.streamStore.getChunksAfter(sessionId, lastReceivedSequence);
	}

	/**
	 * Check if there is an active stream for a session
	 */
	async hasActiveStream(sessionId: ChatSessionId): Promise<boolean> {
		const streamState = await this.streamStore.getStreamState(sessionId);
		return streamState !== null;
	}

	/**
	 * Get the current message ID being streamed for a session
	 */
	async getCurrentMessageId(sessionId: ChatSessionId): Promise<ChatMessageId | null> {
		const streamState = await this.streamStore.getStreamState(sessionId);
		return streamState?.messageId ?? null;
	}

	/**
	 * Handle relay events from other main instances (multi-main mode)
	 */
	@OnPubSubEvent('relay-chat-stream-event', { instanceType: 'main' })
	handleRelayChatStreamEvent(payload: {
		eventType: 'execution-begin' | 'execution-end' | 'begin' | 'chunk' | 'end' | 'error';
		userId: string;
		sessionId: string;
		messageId: string;
		sequenceNumber: number;
		payload: {
			previousMessageId?: string | null;
			retryOfMessageId?: string | null;
			executionId?: number | null;
			content?: string;
			status?: ChatHubMessageStatus;
			error?: string;
		};
	}): void {
		const { eventType, userId, sessionId, messageId, sequenceNumber } = payload;
		const timestamp = Date.now();

		let message: ChatHubStreamEvent | ChatHubExecutionBegin | ChatHubExecutionEnd;

		switch (eventType) {
			case 'execution-begin':
				message = {
					type: 'chatHubExecutionBegin',
					data: {
						sessionId,
						timestamp,
					},
				};
				break;
			case 'execution-end':
				message = {
					type: 'chatHubExecutionEnd',
					data: {
						sessionId,
						status: payload.payload.status ?? 'success',
						timestamp,
					},
				};
				break;
			case 'begin':
				message = {
					type: 'chatHubStreamBegin',
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
					type: 'chatHubStreamChunk',
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
					type: 'chatHubStreamEnd',
					data: {
						sessionId,
						messageId,
						sequenceNumber,
						timestamp,
						status: payload.payload.status ?? 'success',
					},
				};
				break;
			case 'error':
				message = {
					type: 'chatHubStreamError',
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
	 * Always sends to all user's connections so multiple browser windows receive updates.
	 */
	private async sendPushMessage(
		params: Pick<StartStreamParams, 'userId' | 'sessionId' | 'messageId'>,
		message: ChatHubStreamEvent,
		eventType: 'begin' | 'chunk' | 'end' | 'error',
	): Promise<void> {
		const { userId } = params;

		// Send to all user's connections so all browser windows receive updates
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
		message: ChatHubStreamEvent,
		eventType: 'begin' | 'chunk' | 'end' | 'error',
	): Promise<void> {
		const payload: Record<string, unknown> = {};

		switch (message.type) {
			case 'chatHubStreamBegin':
				payload.previousMessageId = message.data.previousMessageId;
				payload.retryOfMessageId = message.data.retryOfMessageId;
				payload.executionId = message.data.executionId;
				break;
			case 'chatHubStreamChunk':
				payload.content = message.data.content;
				break;
			case 'chatHubStreamEnd':
				payload.status = message.data.status;
				break;
			case 'chatHubStreamError':
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
		attachments: ChatHubAttachmentInfo[];
	}): Promise<void> {
		const message: ChatHubHumanMessageCreated = {
			type: 'chatHubHumanMessageCreated',
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
		revisionOfMessageId: ChatMessageId;
		messageId: ChatMessageId;
		content: string;
		attachments: ChatHubAttachmentInfo[];
	}): Promise<void> {
		const message: ChatHubMessageEdited = {
			type: 'chatHubMessageEdited',
			data: {
				sessionId: params.sessionId,
				revisionOfMessageId: params.revisionOfMessageId,
				messageId: params.messageId,
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
			attachments: ChatHubAttachmentInfo[];
		},
		_message: ChatHubHumanMessageCreated,
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
			revisionOfMessageId: ChatMessageId;
			messageId: ChatMessageId;
			content: string;
			attachments: ChatHubAttachmentInfo[];
		},
		_message: ChatHubMessageEdited,
	): Promise<void> {
		await this.publisher.publishCommand({
			command: 'relay-chat-message-edit',
			payload: {
				userId: params.userId,
				sessionId: params.sessionId,
				revisionOfMessageId: params.revisionOfMessageId,
				messageId: params.messageId,
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
		const message: ChatHubHumanMessageCreated = {
			type: 'chatHubHumanMessageCreated',
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
		revisionOfMessageId: string;
		messageId: string;
		content: string;
		attachments: Array<{ id: string; fileName: string; mimeType: string }>;
	}): void {
		const message: ChatHubMessageEdited = {
			type: 'chatHubMessageEdited',
			data: {
				sessionId: payload.sessionId,
				revisionOfMessageId: payload.revisionOfMessageId,
				messageId: payload.messageId,
				content: payload.content,
				attachments: payload.attachments,
				timestamp: Date.now(),
			},
		};

		this.push.sendToUsers(message, [payload.userId]);
	}
}
