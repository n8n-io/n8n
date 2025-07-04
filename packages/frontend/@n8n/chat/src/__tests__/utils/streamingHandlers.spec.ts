import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ref, type Ref } from 'vue';

import type { ChatMessageText } from '@n8n/chat/types';
import { StreamingMessageManager } from '@n8n/chat/utils/streaming';
import {
	handleStreamingChunk,
	handleNodeStart,
	handleNodeComplete,
} from '@n8n/chat/utils/streamingHandlers';

// Mock the chatEventBus
vi.mock('@n8n/chat/event-buses', () => ({
	chatEventBus: {
		emit: vi.fn(),
	},
}));

describe('streamingHandlers', () => {
	let messages: Ref<unknown[]>;
	let receivedMessage: Ref<ChatMessageText | null>;
	let waitingForResponse: Ref<boolean>;
	let streamingManager: StreamingMessageManager;

	beforeEach(() => {
		messages = ref<unknown[]>([]);
		receivedMessage = ref<ChatMessageText | null>(null);
		waitingForResponse = ref(false);
		streamingManager = new StreamingMessageManager();
		vi.clearAllMocks();
	});

	describe('handleStreamingChunk', () => {
		it('should handle single-node streaming (no nodeId)', () => {
			handleStreamingChunk('Hello', undefined, streamingManager, receivedMessage, messages);

			expect(receivedMessage.value).toBeDefined();
			expect(receivedMessage.value?.text).toBe('Hello');
			expect(messages.value).toHaveLength(1);

			handleStreamingChunk(' World!', undefined, streamingManager, receivedMessage, messages);

			expect(receivedMessage.value?.text).toBe('Hello World!');
			expect(messages.value).toHaveLength(1);
		});

		it('should handle multi-node streaming', () => {
			handleStreamingChunk('Hello', 'node-1', streamingManager, receivedMessage, messages);

			expect(receivedMessage.value).toBeDefined();
			expect(receivedMessage.value?.text).toBe('Hello');
			expect(messages.value).toHaveLength(1);

			handleStreamingChunk(' World!', 'node-2', streamingManager, receivedMessage, messages);

			expect(receivedMessage.value?.text).toBe('Hello World!');
		});

		it('should handle errors gracefully', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			// Simulate an error by passing invalid parameters
			const invalidStreamingManager = null as unknown as StreamingMessageManager;

			expect(() => {
				handleStreamingChunk('test', 'node-1', invalidStreamingManager, receivedMessage, messages);
			}).not.toThrow();

			expect(consoleSpy).toHaveBeenCalledWith('Error handling streaming chunk:', expect.any(Error));
			consoleSpy.mockRestore();
		});
	});

	describe('handleNodeStart', () => {
		it('should initialize node without creating message', () => {
			handleNodeStart('node-1', streamingManager);

			expect(receivedMessage.value).toBeNull(); // No message created yet
			expect(messages.value).toHaveLength(0); // No messages until first content
			expect(streamingManager.getNodeCount()).toBe(1); // But node is initialized
		});

		it('should not create duplicate message if one exists', () => {
			const existingMessage = {
				id: 'existing',
				type: 'text' as const,
				text: 'existing',
				sender: 'bot' as const,
			};
			receivedMessage.value = existingMessage;
			messages.value.push(existingMessage);

			handleNodeStart('node-1', streamingManager);

			expect(messages.value).toHaveLength(1);
			expect(receivedMessage.value.id).toBe('existing');
		});

		it('should handle errors gracefully', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const invalidStreamingManager = null as unknown as StreamingMessageManager;

			expect(() => {
				handleNodeStart('node-1', invalidStreamingManager);
			}).not.toThrow();

			expect(consoleSpy).toHaveBeenCalledWith('Error handling node start:', expect.any(Error));
			consoleSpy.mockRestore();
		});
	});

	describe('handleNodeComplete', () => {
		it('should mark node as complete and update message', () => {
			// Setup initial state
			streamingManager.addNodeToActive('node-1');
			streamingManager.addChunkToNode('node-1', 'Hello');
			receivedMessage.value = {
				id: 'msg-1',
				type: 'text',
				text: 'Hello',
				sender: 'bot',
			};
			messages.value.push(receivedMessage.value);

			handleNodeComplete('node-1', streamingManager, receivedMessage, messages, waitingForResponse);

			expect(streamingManager.areAllNodesComplete()).toBe(true);
		});

		it('should set waitingForResponse to false when all nodes complete', () => {
			waitingForResponse.value = true;
			streamingManager.addNodeToActive('node-1');
			streamingManager.addNodeToActive('node-2');

			receivedMessage.value = {
				id: 'msg-1',
				type: 'text',
				text: '',
				sender: 'bot',
			};

			// Complete first node
			handleNodeComplete('node-1', streamingManager, receivedMessage, messages, waitingForResponse);
			expect(waitingForResponse.value).toBe(true);

			// Complete second node
			handleNodeComplete('node-2', streamingManager, receivedMessage, messages, waitingForResponse);
			expect(waitingForResponse.value).toBe(false);
		});

		it('should handle errors gracefully', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const invalidStreamingManager = null as unknown as StreamingMessageManager;

			expect(() => {
				handleNodeComplete(
					'node-1',
					invalidStreamingManager,
					receivedMessage,
					messages,
					waitingForResponse,
				);
			}).not.toThrow();

			expect(consoleSpy).toHaveBeenCalledWith('Error handling node complete:', expect.any(Error));
			consoleSpy.mockRestore();
		});
	});
});
