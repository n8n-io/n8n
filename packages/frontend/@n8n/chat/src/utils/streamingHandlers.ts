import { nextTick } from 'vue';
import type { Ref } from 'vue';

import { chatEventBus } from '@n8n/chat/event-buses';
import type { ChatMessage, ChatMessageText } from '@n8n/chat/types';

import type { StreamingMessageManager } from './streaming';
import { createBotMessage, updateMessageInArray } from './streaming';

export function handleStreamingChunk(
	chunk: string,
	nodeId: string | undefined,
	streamingManager: StreamingMessageManager,
	receivedMessage: Ref<ChatMessageText | null>,
	messages: Ref<ChatMessage[]>,
	runIndex?: number,
): void {
	try {
		// Only skip empty chunks, but not whitespace only chunks
		if (chunk === '') {
			return;
		}

		if (!nodeId) {
			// Simple single-node streaming (backwards compatibility)
			if (!receivedMessage.value) {
				receivedMessage.value = createBotMessage();
				messages.value.push(receivedMessage.value);
			}

			const updatedMessage: ChatMessageText = {
				...receivedMessage.value,
				text: receivedMessage.value.text + chunk,
			};

			updateMessageInArray(messages.value, receivedMessage.value.id, updatedMessage);
			receivedMessage.value = updatedMessage;
		} else {
			// Multi-run streaming with separate messages per runIndex
			// Create message on first chunk if it doesn't exist
			let runMessage = streamingManager.getRunMessage(nodeId, runIndex);
			if (!runMessage) {
				runMessage = streamingManager.addRunToActive(nodeId, runIndex);
				messages.value.push(runMessage);
			}

			// Add chunk to the run
			const updatedMessage = streamingManager.addChunkToRun(nodeId, chunk, runIndex);
			if (updatedMessage) {
				updateMessageInArray(messages.value, updatedMessage.id, updatedMessage);
			}
		}

		void nextTick(() => {
			chatEventBus.emit('scrollToBottom');
		});
	} catch (error) {
		console.error('Error handling stream chunk:', error);
		// Continue gracefully without breaking the stream
	}
}

export function handleNodeStart(
	nodeId: string,
	streamingManager: StreamingMessageManager,
	runIndex?: number,
): void {
	try {
		// Just register the run as starting, don't create a message yet
		// Message will be created when first chunk arrives
		streamingManager.registerRunStart(nodeId, runIndex);
	} catch (error) {
		console.error('Error handling node start:', error);
	}
}

export function handleNodeComplete(
	nodeId: string,
	streamingManager: StreamingMessageManager,
	runIndex?: number,
): void {
	try {
		streamingManager.removeRunFromActive(nodeId, runIndex);
	} catch (error) {
		console.error('Error handling node complete:', error);
	}
}
