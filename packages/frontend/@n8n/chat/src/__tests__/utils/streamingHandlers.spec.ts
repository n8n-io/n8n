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

		it('should handle streaming with separate messages per runIndex', () => {
			// Start the runs (doesn't create messages yet)
			handleNodeStart('node-1', streamingManager, messages, 0);
			handleNodeStart('node-1', streamingManager, messages, 1);

			expect(messages.value).toHaveLength(0); // No messages created yet

			// Now handle chunks for different runs - this will create the messages
			handleStreamingChunk(
				'Run 0 content',
				'node-1',
				streamingManager,
				receivedMessage,
				messages,
				0,
			);
			handleStreamingChunk(
				'Run 1 content',
				'node-1',
				streamingManager,
				receivedMessage,
				messages,
				1,
			);

			expect(messages.value).toHaveLength(2); // Messages created on first chunk

			// Check that we have two separate messages with different content
			const message1 = messages.value[0] as ChatMessageText;
			const message2 = messages.value[1] as ChatMessageText;

			expect(message1.text).toBe('Run 0 content');
			expect(message2.text).toBe('Run 1 content');
			expect(message1.id).not.toBe(message2.id);
		});

		it('should accumulate chunks within the same run', () => {
			// Start a run (doesn't create message yet)
			handleNodeStart('node-1', streamingManager, messages, 0);

			expect(messages.value).toHaveLength(0);

			// Add multiple chunks to the same run - message created on first chunk
			handleStreamingChunk('Hello ', 'node-1', streamingManager, receivedMessage, messages, 0);
			expect(messages.value).toHaveLength(1);

			handleStreamingChunk('World!', 'node-1', streamingManager, receivedMessage, messages, 0);

			const message = messages.value[0] as ChatMessageText;
			expect(message.text).toBe('Hello World!');
			expect(messages.value).toHaveLength(1);
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
		it('should register runs but not create messages yet', () => {
			handleNodeStart('node-1', streamingManager, messages, 0);
			handleNodeStart('node-1', streamingManager, messages, 1);

			// No messages created yet - they'll be created on first chunk
			expect(messages.value).toHaveLength(0);

			// But runs should be registered as active
			// We can verify this by checking that chunks will create messages
			handleStreamingChunk('test', 'node-1', streamingManager, receivedMessage, messages, 0);
			expect(messages.value).toHaveLength(1);
		});

		it('should handle runs without runIndex', () => {
			handleNodeStart('node-1', streamingManager, messages);

			// No message created yet
			expect(messages.value).toHaveLength(0);

			// Verify run is registered by adding a chunk
			handleStreamingChunk('test', 'node-1', streamingManager, receivedMessage, messages);
			expect(messages.value).toHaveLength(1);
		});

		it('should handle errors gracefully', () => {
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			const invalidStreamingManager = null as unknown as StreamingMessageManager;

			expect(() => {
				handleNodeStart('node-1', invalidStreamingManager, messages);
			}).not.toThrow();

			expect(consoleSpy).toHaveBeenCalledWith('Error handling node start:', expect.any(Error));
			consoleSpy.mockRestore();
		});
	});

	describe('handleNodeComplete', () => {
		it('should mark run as complete', () => {
			// Setup initial state
			streamingManager.addRunToActive('node-1', 0);

			handleNodeComplete(
				'node-1',
				streamingManager,
				receivedMessage,
				messages,
				waitingForResponse,
				0,
			);

			expect(streamingManager.areAllRunsComplete()).toBe(true);
		});

		it('should handle multiple runs completion', () => {
			waitingForResponse.value = true;

			// Setup two runs
			streamingManager.addRunToActive('node-1', 0);
			streamingManager.addRunToActive('node-1', 1);

			// Complete first run
			handleNodeComplete(
				'node-1',
				streamingManager,
				receivedMessage,
				messages,
				waitingForResponse,
				0,
			);
			expect(streamingManager.areAllRunsComplete()).toBe(false);
			expect(waitingForResponse.value).toBe(true);

			// Complete second run
			handleNodeComplete(
				'node-1',
				streamingManager,
				receivedMessage,
				messages,
				waitingForResponse,
				1,
			);
			expect(streamingManager.areAllRunsComplete()).toBe(true);
			expect(waitingForResponse.value).toBe(false);
		});

		it('should set waitingForResponse to false when all runs complete', () => {
			waitingForResponse.value = true;
			streamingManager.addRunToActive('node-1', 0);
			streamingManager.addRunToActive('node-2', 0);

			// Complete first run
			handleNodeComplete(
				'node-1',
				streamingManager,
				receivedMessage,
				messages,
				waitingForResponse,
				0,
			);
			expect(waitingForResponse.value).toBe(true);

			// Complete second run
			handleNodeComplete(
				'node-2',
				streamingManager,
				receivedMessage,
				messages,
				waitingForResponse,
				0,
			);
			expect(waitingForResponse.value).toBe(false);
		});

		it('should handle runs without runIndex', () => {
			waitingForResponse.value = true;
			streamingManager.addRunToActive('node-1');

			handleNodeComplete('node-1', streamingManager, receivedMessage, messages, waitingForResponse);

			expect(streamingManager.areAllRunsComplete()).toBe(true);
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
