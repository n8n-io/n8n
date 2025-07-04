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
		streamingManager.addNodeToActive(nodeId);
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
				waitingForResponse.value = false;
			}
		}
	} catch (error) {
		console.error('Error handling node complete:', error);
	}
}
