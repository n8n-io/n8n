import { describe, expect, it } from 'vitest';

import type { ChatMessageText } from '@n8n/chat/types';
import {
	StreamingMessageManager,
	createBotMessage,
	updateMessageInArray,
} from '@n8n/chat/utils/streaming';

describe('StreamingMessageManager', () => {
	it('should initialize runs correctly', () => {
		const manager = new StreamingMessageManager();

		const message1 = manager.initializeRun('node-1', 0);
		const message2 = manager.initializeRun('node-1', 1);

		expect(manager.getRunCount()).toBe(2);
		expect(message1.id).toBeDefined();
		expect(message2.id).toBeDefined();
		expect(message1.id).not.toBe(message2.id);
	});

	it('should create separate messages for different runs', () => {
		const manager = new StreamingMessageManager();

		// Initialize two different runs
		const message1 = manager.addRunToActive('node-1', 0);
		const message2 = manager.addRunToActive('node-1', 1);

		expect(manager.getRunCount()).toBe(2);
		expect(message1.id).not.toBe(message2.id);

		// Add chunks to different runs
		const result1 = manager.addChunkToRun('node-1', 'Run 0 content', 0);
		const result2 = manager.addChunkToRun('node-1', 'Run 1 content', 1);

		expect(result1?.text).toBe('Run 0 content');
		expect(result2?.text).toBe('Run 1 content');
		expect(result1?.id).toBe(message1.id);
		expect(result2?.id).toBe(message2.id);
	});

	it('should accumulate chunks within the same run', () => {
		const manager = new StreamingMessageManager();

		const message = manager.addRunToActive('node-1', 0);

		manager.addChunkToRun('node-1', 'Hello ', 0);
		const result = manager.addChunkToRun('node-1', 'World!', 0);

		expect(result?.text).toBe('Hello World!');
		expect(result?.id).toBe(message.id);
	});

	it('should handle runs without runIndex (backward compatibility)', () => {
		const manager = new StreamingMessageManager();

		const message = manager.addRunToActive('node-1');
		const result = manager.addChunkToRun('node-1', 'Single run content');

		expect(result?.text).toBe('Single run content');
		expect(result?.id).toBe(message.id);
		expect(manager.getRunCount()).toBe(1);
	});

	it('should track active runs correctly', () => {
		const manager = new StreamingMessageManager();

		manager.addRunToActive('node-1', 0);
		manager.addRunToActive('node-1', 1);

		expect(manager.getRunCount()).toBe(2);

		manager.removeRunFromActive('node-1', 0);
		expect(manager.areAllRunsComplete()).toBe(false);

		manager.removeRunFromActive('node-1', 1);
		expect(manager.areAllRunsComplete()).toBe(true);
	});

	it('should return all messages in order', () => {
		const manager = new StreamingMessageManager();

		const message1 = manager.addRunToActive('node-1', 0);
		const message2 = manager.addRunToActive('node-1', 1);
		const message3 = manager.addRunToActive('node-2', 0);

		const allMessages = manager.getAllMessages();

		expect(allMessages).toHaveLength(3);
		expect(allMessages[0].id).toBe(message1.id);
		expect(allMessages[1].id).toBe(message2.id);
		expect(allMessages[2].id).toBe(message3.id);
	});

	it('should reset correctly', () => {
		const manager = new StreamingMessageManager();

		manager.addRunToActive('node-1', 0);
		manager.addRunToActive('node-1', 1);
		manager.addChunkToRun('node-1', 'test', 0);

		expect(manager.getRunCount()).toBe(2);

		manager.reset();

		expect(manager.getRunCount()).toBe(0);
		expect(manager.getAllMessages()).toHaveLength(0);
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

	it('should throw error on non-existent message id', () => {
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

		expect(() => updateMessageInArray(messages, 'non-existent', updatedMessage)).toThrow(
			"Can't update message. No message with id non-existent found",
		);
	});
});
