import { describe, expect, it } from 'vitest';

import type { ChatMessageText } from '@n8n/chat/types';
import {
	StreamingMessageManager,
	createBotMessage,
	updateMessageInArray,
} from '@n8n/chat/utils/streaming';

describe('StreamingMessageManager', () => {
	it('should initialize nodes correctly', () => {
		const manager = new StreamingMessageManager();

		manager.initializeNode('node-1');

		expect(manager.getNodeCount()).toBe(1);
	});

	it('should add chunks to nodes and return combined content', () => {
		const manager = new StreamingMessageManager();

		const content1 = manager.addChunkToNode('node-1', 'Hello ');
		const content2 = manager.addChunkToNode('node-2', 'World!');
		const content3 = manager.addChunkToNode('node-1', 'from ');
		const content4 = manager.addChunkToNode('node-1', 'node1');

		expect(content1).toBe('Hello ');
		expect(content2).toBe('Hello World!');
		expect(content3).toBe('Hello from World!');
		expect(content4).toBe('Hello from node1World!');
	});

	it('should handle runIndex and itemIndex correctly', () => {
		const manager = new StreamingMessageManager();

		// Same node, different run indexes
		const content1 = manager.addChunkToNode('node-1', 'Run 0 ', 0);
		const content2 = manager.addChunkToNode('node-1', 'Run 1 ', 1);
		const content3 = manager.addChunkToNode('node-1', 'more', 0);

		expect(content1).toBe('Run 0 ');
		expect(content2).toBe('Run 0 Run 1 ');
		expect(content3).toBe('Run 0 moreRun 1 ');
	});

	it('should handle itemIndex correctly', () => {
		const manager = new StreamingMessageManager();

		// Same node, same run, different items
		const content1 = manager.addChunkToNode('node-1', 'Item 0 ', 0, 0);
		const content2 = manager.addChunkToNode('node-1', 'Item 1 ', 0, 1);
		const content3 = manager.addChunkToNode('node-1', 'more', 0, 0);

		expect(content1).toBe('Item 0 ');
		expect(content2).toBe('Item 0 Item 1 ');
		expect(content3).toBe('Item 0 moreItem 1 ');
	});

	it('should track active nodes correctly', () => {
		const manager = new StreamingMessageManager();

		manager.addNodeToActive('node-1');
		manager.addNodeToActive('node-2');

		expect(manager.getNodeCount()).toBe(2);

		manager.removeNodeFromActive('node-1');
		expect(manager.areAllNodesComplete()).toBe(false);

		manager.removeNodeFromActive('node-2');
		expect(manager.areAllNodesComplete()).toBe(true);
	});

	it('should track active nodes with runIndex and itemIndex correctly', () => {
		const manager = new StreamingMessageManager();

		manager.addNodeToActive('node-1', 0, 0);
		manager.addNodeToActive('node-1', 0, 1);
		manager.addNodeToActive('node-1', 1, 0);

		expect(manager.getNodeCount()).toBe(3);

		manager.removeNodeFromActive('node-1', 0, 0);
		expect(manager.areAllNodesComplete()).toBe(false);

		manager.removeNodeFromActive('node-1', 0, 1);
		expect(manager.areAllNodesComplete()).toBe(false);

		manager.removeNodeFromActive('node-1', 1, 0);
		expect(manager.areAllNodesComplete()).toBe(true);
	});

	it('should reset correctly', () => {
		const manager = new StreamingMessageManager();

		manager.addChunkToNode('node-1', 'test');
		manager.addNodeToActive('node-2');

		expect(manager.getNodeCount()).toBe(2);

		manager.reset();

		expect(manager.getNodeCount()).toBe(0);
		expect(manager.getCombinedContent()).toBe('');
	});
});

describe('createBotMessage', () => {
	it('should create a bot message with default values', () => {
		const message = createBotMessage();

		expect(message.type).toBe('text');
		expect(message.text).toBe('');
		expect(message.sender).toBe('bot');
		expect(message.id).toBeDefined();
	});

	it('should create a bot message with custom id', () => {
		const customId = 'custom-id-123';
		const message = createBotMessage(customId);

		expect(message.id).toBe(customId);
	});
});

describe('updateMessageInArray', () => {
	it('should update message in array', () => {
		const messages: ChatMessageText[] = [
			{
				id: 'msg-1',
				type: 'text',
				text: 'Hello',
				sender: 'bot',
			},
			{
				id: 'msg-2',
				type: 'text',
				text: 'World',
				sender: 'user',
			},
		];

		const updatedMessage: ChatMessageText = {
			id: 'msg-1',
			type: 'text',
			text: 'Hello Updated',
			sender: 'bot',
		};

		updateMessageInArray(messages, 'msg-1', updatedMessage);

		expect(messages[0].text).toBe('Hello Updated');
		expect(messages[1].text).toBe('World'); // Should remain unchanged
	});

	it('should handle non-existent message id gracefully', () => {
		const messages: ChatMessageText[] = [
			{
				id: 'msg-1',
				type: 'text',
				text: 'Hello',
				sender: 'bot',
			},
		];

		const updatedMessage: ChatMessageText = {
			id: 'non-existent',
			type: 'text',
			text: 'Should not be added',
			sender: 'bot',
		};

		updateMessageInArray(messages, 'non-existent', updatedMessage);

		expect(messages).toHaveLength(1);
		expect(messages[0].text).toBe('Hello');
	});
});
