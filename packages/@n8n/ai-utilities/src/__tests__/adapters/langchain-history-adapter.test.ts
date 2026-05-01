import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';

import { LangchainHistoryAdapter } from '../../adapters/langchain-history';
import type { ChatHistory } from '../../types/memory';
import type { Message } from '../../types/message';

describe('LangchainHistoryAdapter', () => {
	const createMessage = (role: 'user' | 'assistant' | 'system', text: string): Message => ({
		role,
		content: [{ type: 'text', text }],
	});

	const createMockHistory = (messages: Message[] = []): ChatHistory => ({
		getMessages: jest.fn().mockResolvedValue([...messages]),
		addMessage: jest.fn().mockResolvedValue(undefined),
		addMessages: jest.fn().mockResolvedValue(undefined),
		clear: jest.fn().mockResolvedValue(undefined),
	});

	describe('getMessages', () => {
		it('should return empty array when no messages', async () => {
			const history = createMockHistory([]);
			const adapter = new LangchainHistoryAdapter(history);

			const result = await adapter.getMessages();

			expect(result).toEqual([]);
		});

		it('should convert human messages to HumanMessage', async () => {
			const history = createMockHistory([createMessage('user', 'Hello')]);
			const adapter = new LangchainHistoryAdapter(history);

			const result = await adapter.getMessages();

			expect(result).toHaveLength(1);
			expect(result[0]).toBeInstanceOf(HumanMessage);
			expect(result[0].content).toEqual([{ type: 'text', text: 'Hello' }]);
		});

		it('should convert AI messages to AIMessage', async () => {
			const history = createMockHistory([createMessage('assistant', 'Hi there!')]);
			const adapter = new LangchainHistoryAdapter(history);

			const result = await adapter.getMessages();

			expect(result).toHaveLength(1);
			expect(result[0]).toBeInstanceOf(AIMessage);
			expect(result[0].content).toEqual([{ type: 'text', text: 'Hi there!' }]);
		});

		it('should convert system messages to SystemMessage', async () => {
			const history = createMockHistory([createMessage('system', 'You are a helpful assistant')]);
			const adapter = new LangchainHistoryAdapter(history);

			const result = await adapter.getMessages();

			expect(result).toHaveLength(1);
			expect(result[0]).toBeInstanceOf(SystemMessage);
			expect(result[0].content).toEqual([{ type: 'text', text: 'You are a helpful assistant' }]);
		});

		it('should convert multiple messages preserving order', async () => {
			const messages = [
				createMessage('system', 'System prompt'),
				createMessage('user', 'Hello'),
				createMessage('assistant', 'Hi!'),
			];
			const history = createMockHistory(messages);
			const adapter = new LangchainHistoryAdapter(history);

			const result = await adapter.getMessages();

			expect(result).toHaveLength(3);
			expect(result[0]).toBeInstanceOf(SystemMessage);
			expect(result[1]).toBeInstanceOf(HumanMessage);
			expect(result[2]).toBeInstanceOf(AIMessage);
		});
	});

	describe('addMessage', () => {
		it('should convert LangChain HumanMessage to n8n format and delegate', async () => {
			const history = createMockHistory();
			const adapter = new LangchainHistoryAdapter(history);

			await adapter.addMessage(new HumanMessage('Hello'));

			expect(history.addMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					role: 'user',
					content: expect.arrayContaining([
						expect.objectContaining({ type: 'text', text: 'Hello' }),
					]),
				}),
			);
		});

		it('should convert LangChain AIMessage to n8n format and delegate', async () => {
			const history = createMockHistory();
			const adapter = new LangchainHistoryAdapter(history);

			await adapter.addMessage(new AIMessage('Hi there!'));

			expect(history.addMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					role: 'assistant',
					content: expect.arrayContaining([
						expect.objectContaining({ type: 'text', text: 'Hi there!' }),
					]),
				}),
			);
		});

		it('should convert LangChain ToolMessage to n8n format and delegate', async () => {
			const history = createMockHistory();
			const adapter = new LangchainHistoryAdapter(history);

			await adapter.addMessage(new ToolMessage({ content: 'result', tool_call_id: 'call-1' }));

			expect(history.addMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					role: 'tool',
					content: expect.arrayContaining([
						expect.objectContaining({ type: 'tool-result', toolCallId: 'call-1' }),
					]),
				}),
			);
		});
	});

	describe('addMessages', () => {
		it('should convert and delegate multiple messages in batch', async () => {
			const history = createMockHistory();
			const adapter = new LangchainHistoryAdapter(history);

			await adapter.addMessages([new HumanMessage('Hello'), new AIMessage('Hi!')]);

			expect(history.addMessages).toHaveBeenCalledWith([
				expect.objectContaining({ role: 'user' }),
				expect.objectContaining({ role: 'assistant' }),
			]);
		});

		it('should call addMessages with empty array', async () => {
			const history = createMockHistory();
			const adapter = new LangchainHistoryAdapter(history);

			await adapter.addMessages([]);

			expect(history.addMessages).toHaveBeenCalledWith([]);
		});
	});

	describe('clear', () => {
		it('should delegate to history.clear()', async () => {
			const history = createMockHistory();
			const adapter = new LangchainHistoryAdapter(history);

			await adapter.clear();

			expect(history.clear).toHaveBeenCalled();
		});
	});
});
