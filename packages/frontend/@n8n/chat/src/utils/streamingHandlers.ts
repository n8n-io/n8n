import { nextTick } from 'vue';
import type { Ref } from 'vue';

import { chatEventBus } from '@n8n/chat/event-buses';
import type { ChatMessageText } from '@n8n/chat/types';

import type { StreamingMessageManager } from './streaming';
import { createBotMessage, updateMessageInArray } from './streaming';

export function handleStreamingChunk(
	chunk: string,
	nodeId: string | undefined,
	streamingManager: StreamingMessageManager,
	receivedMessage: Ref<ChatMessageText | null>,
	messages: Ref<unknown[]>,
): void {
	try {
		if (process.env.NODE_ENV === 'development') {
			console.log('Processing chunk:', { nodeId, length: chunk.length });
		}

		// Only create the bot message when we receive the first actual content
		if (!receivedMessage.value && chunk.trim()) {
			receivedMessage.value = createBotMessage();
			messages.value.push(receivedMessage.value);
		}

		// Skip empty chunks to avoid showing empty responses
		if (!chunk.trim()) {
			return;
		}

		if (!nodeId) {
			// Simple single-node streaming (backwards compatibility)
			if (receivedMessage.value) {
				const updatedMessage: ChatMessageText = {
					...receivedMessage.value,
					text: receivedMessage.value.text + chunk,
				};

				updateMessageInArray(messages.value, receivedMessage.value.id, updatedMessage);
				receivedMessage.value = updatedMessage;

				if (process.env.NODE_ENV === 'development') {
					console.log('Updated single message, total length:', updatedMessage.text.length);
				}
			}
		} else {
			// Multi-node parallel streaming
			if (receivedMessage.value) {
				const combinedContent = streamingManager.addChunkToNode(nodeId, chunk);
				const updatedMessage: ChatMessageText = {
					...receivedMessage.value,
					text: combinedContent,
				};

				updateMessageInArray(messages.value, receivedMessage.value.id, updatedMessage);
				receivedMessage.value = updatedMessage;

				if (process.env.NODE_ENV === 'development') {
					console.log('Updated combined message with', streamingManager.getNodeCount(), 'nodes');
				}
			}
		}

		void nextTick(() => {
			chatEventBus.emit('scrollToBottom');
		});
	} catch (error) {
		console.error('Error handling streaming chunk:', error);
		// Continue gracefully without breaking the stream
	}
}

export function handleNodeStart(nodeId: string, streamingManager: StreamingMessageManager): void {
	try {
		if (process.env.NODE_ENV === 'development') {
			console.log('Node started:', nodeId);
		}

		streamingManager.addNodeToActive(nodeId);

		// Don't create the message yet - wait for the first content chunk
		// This prevents showing <Empty Response> before actual content arrives

		void nextTick(() => {
			chatEventBus.emit('scrollToBottom');
		});
	} catch (error) {
		console.error('Error handling node start:', error);
	}
}

export function handleNodeComplete(
	nodeId: string,
	streamingManager: StreamingMessageManager,
	receivedMessage: Ref<ChatMessageText | null>,
	messages: Ref<unknown[]>,
	waitingForResponse: Ref<boolean>,
): void {
	try {
		if (process.env.NODE_ENV === 'development') {
			console.log('Node completed:', nodeId);
		}

		streamingManager.removeNodeFromActive(nodeId);

		if (receivedMessage.value) {
			const combinedContent = streamingManager.getCombinedContent();
			const updatedMessage: ChatMessageText = {
				...receivedMessage.value,
				text: combinedContent,
			};

			updateMessageInArray(messages.value, receivedMessage.value.id, updatedMessage);
			receivedMessage.value = updatedMessage;

			if (streamingManager.areAllNodesComplete()) {
				if (process.env.NODE_ENV === 'development') {
					console.log('All nodes completed, streaming finished');
				}
				waitingForResponse.value = false;
			}
		}
	} catch (error) {
		console.error('Error handling node complete:', error);
	}
}
