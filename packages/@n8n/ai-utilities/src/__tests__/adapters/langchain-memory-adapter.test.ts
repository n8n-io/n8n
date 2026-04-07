import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';

import { LangchainMemoryAdapter } from '../../adapters/langchain-memory';
import type { ChatHistory, ChatMemory } from '../../types/memory';
import type { Message } from '../../types/message';

describe('LangchainMemoryAdapter', () => {
	const createMessage = (role: 'user' | 'assistant' | 'system', text: string): Message => ({
		role,
		content: [{ type: 'text', text }],
	});

	const createMockMemory = (messages: Message[] = []): ChatMemory => {
		const mockHistory: ChatHistory = {
			getMessages: jest.fn().mockResolvedValue([...messages]),
			addMessage: jest.fn().mockResolvedValue(undefined),
			addMessages: jest.fn().mockResolvedValue(undefined),
			clear: jest.fn().mockResolvedValue(undefined),
		};

		return {
			loadMessages: jest.fn().mockResolvedValue([...messages]),
			saveTurn: jest.fn().mockResolvedValue(undefined),
			clear: jest.fn().mockResolvedValue(undefined),
			chatHistory: mockHistory,
		};
	};

	describe('loadMemoryVariables', () => {
		it('should return empty chat_history when no messages', async () => {
			const memory = createMockMemory([]);
			const adapter = new LangchainMemoryAdapter(memory);

			const result = await adapter.loadMemoryVariables({});

			expect(result.chat_history).toEqual([]);
		});

		it('should convert human messages to HumanMessage', async () => {
			const memory = createMockMemory([createMessage('user', 'Hello')]);
			const adapter = new LangchainMemoryAdapter(memory);

			const result = await adapter.loadMemoryVariables({});

			expect(result.chat_history).toHaveLength(1);
			expect(result.chat_history[0]).toBeInstanceOf(HumanMessage);
			expect(result.chat_history[0].content).toEqual([{ type: 'text', text: 'Hello' }]);
		});

		it('should convert AI messages to AIMessage', async () => {
			const memory = createMockMemory([createMessage('assistant', 'Hi there!')]);
			const adapter = new LangchainMemoryAdapter(memory);

			const result = await adapter.loadMemoryVariables({});

			expect(result.chat_history).toHaveLength(1);
			expect(result.chat_history[0]).toBeInstanceOf(AIMessage);
			expect(result.chat_history[0].content).toEqual([{ type: 'text', text: 'Hi there!' }]);
		});

		it('should convert system messages to SystemMessage', async () => {
			const memory = createMockMemory([createMessage('system', 'You are a helpful assistant')]);
			const adapter = new LangchainMemoryAdapter(memory);

			const result = await adapter.loadMemoryVariables({});

			expect(result.chat_history).toHaveLength(1);
			expect(result.chat_history[0]).toBeInstanceOf(SystemMessage);
			expect(result.chat_history[0].content).toEqual([
				{ type: 'text', text: 'You are a helpful assistant' },
			]);
		});

		it('should convert multiple messages in order', async () => {
			const messages = [
				createMessage('system', 'System prompt'),
				createMessage('user', 'Hello'),
				createMessage('assistant', 'Hi!'),
			];
			const memory = createMockMemory(messages);
			const adapter = new LangchainMemoryAdapter(memory);

			const result = await adapter.loadMemoryVariables({});

			expect(result.chat_history).toHaveLength(3);
			expect(result.chat_history[0]).toBeInstanceOf(SystemMessage);
			expect(result.chat_history[1]).toBeInstanceOf(HumanMessage);
			expect(result.chat_history[2]).toBeInstanceOf(AIMessage);
		});
	});

	describe('saveContext', () => {
		it('should call memory.saveTurn with input and output', async () => {
			const memory = createMockMemory();
			const adapter = new LangchainMemoryAdapter(memory);

			await adapter.saveContext({ input: 'Hello!' }, { output: 'Hi there!' });

			expect(memory.saveTurn).toHaveBeenCalledWith('Hello!', 'Hi there!');
		});
	});

	describe('clear', () => {
		it('should call memory.clear()', async () => {
			const memory = createMockMemory();
			const adapter = new LangchainMemoryAdapter(memory);

			await adapter.clear();

			expect(memory.clear).toHaveBeenCalled();
		});
	});

	describe('memoryKeys', () => {
		it('should return chat_history as memory key', () => {
			const memory = createMockMemory();
			const adapter = new LangchainMemoryAdapter(memory);

			expect(adapter.memoryKeys).toEqual(['chat_history']);
		});
	});
});
