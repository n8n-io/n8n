import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import type { IChatMemoryService, ChatMemoryEntry } from 'n8n-workflow';

import { ChatMemoryMessageHistory } from './ChatMemoryMessageHistory';

describe('ChatMemoryMessageHistory', () => {
	const createMockMemoryService = (): jest.Mocked<IChatMemoryService> => ({
		getOwnerId: jest.fn(),
		getMemory: jest.fn(),
		addHumanMessage: jest.fn(),
		addAIMessage: jest.fn(),
		addToolMessage: jest.fn(),
		clearMemory: jest.fn(),
		ensureSession: jest.fn(),
	});

	const createEntry = (
		overrides: Partial<ChatMemoryEntry> & Pick<ChatMemoryEntry, 'role' | 'content' | 'name'>,
	): ChatMemoryEntry => ({
		id: crypto.randomUUID(),
		createdAt: new Date(),
		...overrides,
	});

	describe('getMessages', () => {
		it('should return empty array when no messages', async () => {
			const memoryService = createMockMemoryService();
			memoryService.getMemory.mockResolvedValue([]);

			const history = new ChatMemoryMessageHistory({ memoryService });
			const messages = await history.getMessages();

			expect(messages).toEqual([]);
			expect(memoryService.getMemory).toHaveBeenCalled();
		});

		it('should convert human message entries', async () => {
			const memoryService = createMockMemoryService();
			const entries: ChatMemoryEntry[] = [
				createEntry({
					role: 'human',
					content: { content: 'Hello there!' },
					name: 'User',
				}),
			];
			memoryService.getMemory.mockResolvedValue(entries);

			const history = new ChatMemoryMessageHistory({ memoryService });
			const messages = await history.getMessages();

			expect(messages).toHaveLength(1);
			expect(messages[0]).toBeInstanceOf(HumanMessage);
			expect(messages[0].content).toBe('Hello there!');
		});

		it('should convert AI message entries', async () => {
			const memoryService = createMockMemoryService();
			const entries: ChatMemoryEntry[] = [
				createEntry({
					role: 'ai',
					content: { content: 'Hello! How can I help?', toolCalls: [] },
					name: 'AI',
				}),
			];
			memoryService.getMemory.mockResolvedValue(entries);

			const history = new ChatMemoryMessageHistory({ memoryService });
			const messages = await history.getMessages();

			expect(messages).toHaveLength(1);
			expect(messages[0]).toBeInstanceOf(AIMessage);
			expect(messages[0].content).toBe('Hello! How can I help?');
		});

		it('should convert AI message entries with tool calls', async () => {
			const memoryService = createMockMemoryService();
			const toolCalls = [{ id: 'call_1', name: 'search', args: { query: 'test' } }];
			const entries: ChatMemoryEntry[] = [
				createEntry({
					role: 'ai',
					content: { content: 'Let me search for that', toolCalls },
					name: 'AI',
				}),
			];
			memoryService.getMemory.mockResolvedValue(entries);

			const history = new ChatMemoryMessageHistory({ memoryService });
			const messages = await history.getMessages();

			expect(messages).toHaveLength(1);
			expect(messages[0]).toBeInstanceOf(AIMessage);
			const aiMessage = messages[0] as AIMessage;
			expect(aiMessage.tool_calls).toEqual(toolCalls);
		});

		it('should convert tool message entries', async () => {
			const memoryService = createMockMemoryService();
			const entries: ChatMemoryEntry[] = [
				createEntry({
					role: 'tool',
					content: {
						toolCallId: 'call_1',
						toolName: 'search',
						toolInput: { query: 'test' },
						toolOutput: { results: ['result 1', 'result 2'] },
					},
					name: 'search',
				}),
			];
			memoryService.getMemory.mockResolvedValue(entries);

			const history = new ChatMemoryMessageHistory({ memoryService });
			const messages = await history.getMessages();

			expect(messages).toHaveLength(1);
			expect(messages[0]).toBeInstanceOf(ToolMessage);
			const toolMessage = messages[0] as ToolMessage;
			expect(toolMessage.tool_call_id).toBe('call_1');
			expect(toolMessage.name).toBe('search');
		});

		it('should convert system message entries', async () => {
			const memoryService = createMockMemoryService();
			const entries: ChatMemoryEntry[] = [
				createEntry({
					role: 'system',
					content: { content: 'You are a helpful assistant.' },
					name: 'System',
				}),
			];
			memoryService.getMemory.mockResolvedValue(entries);

			const history = new ChatMemoryMessageHistory({ memoryService });
			const messages = await history.getMessages();

			expect(messages).toHaveLength(1);
			expect(messages[0]).toBeInstanceOf(SystemMessage);
			expect(messages[0].content).toBe('You are a helpful assistant.');
		});

		it('should handle unknown role as system message', async () => {
			const memoryService = createMockMemoryService();
			const entries: ChatMemoryEntry[] = [
				createEntry({
					role: 'unknown' as 'system',
					content: { content: 'Unknown content' },
					name: 'Unknown',
				}),
			];
			memoryService.getMemory.mockResolvedValue(entries);

			const history = new ChatMemoryMessageHistory({ memoryService });
			const messages = await history.getMessages();

			expect(messages).toHaveLength(1);
			expect(messages[0]).toBeInstanceOf(SystemMessage);
		});

		it('should JSON stringify non-standard content formats', async () => {
			const memoryService = createMockMemoryService();
			const nonStandardContent = { someField: 'value' };
			const entries: ChatMemoryEntry[] = [
				createEntry({
					role: 'human',
					content: nonStandardContent as unknown as ChatMemoryEntry['content'],
					name: 'User',
				}),
			];
			memoryService.getMemory.mockResolvedValue(entries);

			const history = new ChatMemoryMessageHistory({ memoryService });
			const messages = await history.getMessages();

			expect(messages).toHaveLength(1);
			expect(messages[0].content).toBe(JSON.stringify(nonStandardContent));
		});

		it('should convert multiple messages in order', async () => {
			const memoryService = createMockMemoryService();
			const entries: ChatMemoryEntry[] = [
				createEntry({ role: 'human', content: { content: 'Hi' }, name: 'User' }),
				createEntry({ role: 'ai', content: { content: 'Hello!', toolCalls: [] }, name: 'AI' }),
				createEntry({ role: 'human', content: { content: 'How are you?' }, name: 'User' }),
				createEntry({ role: 'ai', content: { content: "I'm good!", toolCalls: [] }, name: 'AI' }),
			];
			memoryService.getMemory.mockResolvedValue(entries);

			const history = new ChatMemoryMessageHistory({ memoryService });
			const messages = await history.getMessages();

			expect(messages).toHaveLength(4);
			expect(messages[0]).toBeInstanceOf(HumanMessage);
			expect(messages[1]).toBeInstanceOf(AIMessage);
			expect(messages[2]).toBeInstanceOf(HumanMessage);
			expect(messages[3]).toBeInstanceOf(AIMessage);
		});
	});

	describe('addMessage', () => {
		it('should add human message', async () => {
			const memoryService = createMockMemoryService();
			const history = new ChatMemoryMessageHistory({ memoryService });

			await history.addMessage(new HumanMessage('Hello'));

			expect(memoryService.addHumanMessage).toHaveBeenCalledWith('Hello');
		});

		it('should add AI message', async () => {
			const memoryService = createMockMemoryService();
			const history = new ChatMemoryMessageHistory({ memoryService });

			await history.addMessage(new AIMessage('Hello!'));

			expect(memoryService.addAIMessage).toHaveBeenCalledWith('Hello!', []);
		});

		it('should add AI message with tool calls', async () => {
			const memoryService = createMockMemoryService();
			const history = new ChatMemoryMessageHistory({ memoryService });
			const toolCalls = [{ id: 'call_1', name: 'search', args: { query: 'test' } }];

			await history.addMessage(new AIMessage({ content: 'Searching...', tool_calls: toolCalls }));

			expect(memoryService.addAIMessage).toHaveBeenCalledWith('Searching...', toolCalls);
		});

		it('should add tool message', async () => {
			const memoryService = createMockMemoryService();
			const history = new ChatMemoryMessageHistory({ memoryService });

			await history.addMessage(
				new ToolMessage({ content: 'Result', tool_call_id: 'call_1', name: 'search' }),
			);

			expect(memoryService.addToolMessage).toHaveBeenCalledWith('call_1', 'search', {}, 'Result');
		});

		it('should handle tool message without name', async () => {
			const memoryService = createMockMemoryService();
			const history = new ChatMemoryMessageHistory({ memoryService });

			await history.addMessage(new ToolMessage({ content: 'Result', tool_call_id: 'call_1' }));

			expect(memoryService.addToolMessage).toHaveBeenCalledWith('call_1', 'unknown', {}, 'Result');
		});

		it('should not save system messages', async () => {
			const memoryService = createMockMemoryService();
			const history = new ChatMemoryMessageHistory({ memoryService });

			await history.addMessage(new SystemMessage('You are helpful'));

			expect(memoryService.addHumanMessage).not.toHaveBeenCalled();
			expect(memoryService.addAIMessage).not.toHaveBeenCalled();
			expect(memoryService.addToolMessage).not.toHaveBeenCalled();
		});

		it('should stringify array content', async () => {
			const memoryService = createMockMemoryService();
			const history = new ChatMemoryMessageHistory({ memoryService });
			const arrayContent = [
				{ type: 'text', text: 'Hello' },
				{ type: 'image_url', image_url: 'http://example.com/img.png' },
			];

			await history.addMessage(new HumanMessage({ content: arrayContent }));

			expect(memoryService.addHumanMessage).toHaveBeenCalledWith(JSON.stringify(arrayContent));
		});
	});

	describe('addMessages', () => {
		it('should add multiple messages in sequence', async () => {
			const memoryService = createMockMemoryService();
			const history = new ChatMemoryMessageHistory({ memoryService });

			await history.addMessages([new HumanMessage('Hi'), new AIMessage('Hello!')]);

			expect(memoryService.addHumanMessage).toHaveBeenCalledWith('Hi');
			expect(memoryService.addAIMessage).toHaveBeenCalledWith('Hello!', []);
		});
	});

	describe('addUserMessage', () => {
		it('should add a user message', async () => {
			const memoryService = createMockMemoryService();
			const history = new ChatMemoryMessageHistory({ memoryService });

			await history.addUserMessage('Hello');

			expect(memoryService.addHumanMessage).toHaveBeenCalledWith('Hello');
		});
	});

	describe('addAIMessage', () => {
		it('should add an AI message', async () => {
			const memoryService = createMockMemoryService();
			const history = new ChatMemoryMessageHistory({ memoryService });

			await history.addAIMessage('Hello!');

			expect(memoryService.addAIMessage).toHaveBeenCalledWith('Hello!', []);
		});
	});

	describe('clear', () => {
		it('should clear memory', async () => {
			const memoryService = createMockMemoryService();
			const history = new ChatMemoryMessageHistory({ memoryService });

			await history.clear();

			expect(memoryService.clearMemory).toHaveBeenCalled();
		});
	});
});
