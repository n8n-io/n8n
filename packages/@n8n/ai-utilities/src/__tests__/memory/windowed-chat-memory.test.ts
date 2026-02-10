import { WindowedChatMemory } from '../../memory/windowed-chat-memory';
import type { ChatHistory } from '../../types/memory';
import type { Message } from '../../types/message';

describe('WindowedChatMemory', () => {
	const createMessage = (role: 'human' | 'ai', text: string): Message => ({
		role,
		content: [{ type: 'text', text }],
	});

	const createMockHistory = (messages: Message[] = []): ChatHistory => {
		const storage = [...messages];
		return {
			getMessages: jest.fn().mockImplementation(async () => await Promise.resolve([...storage])),
			addMessage: jest.fn().mockImplementation(async (msg: Message) => {
				storage.push(msg);
				return;
			}),
			addMessages: jest.fn().mockImplementation(async (msgs: Message[]) => {
				storage.push(...msgs);
				return;
			}),
			clear: jest.fn().mockImplementation(async () => {
				storage.length = 0;
				return;
			}),
		};
	};

	describe('loadMessages', () => {
		it('should return empty array when history is empty', async () => {
			const history = createMockHistory();
			const memory = new WindowedChatMemory(history, { windowSize: 5 });

			const messages = await memory.loadMessages();

			expect(messages).toEqual([]);
		});

		it('should return all messages when under window size', async () => {
			const msgs = [createMessage('human', 'Hello'), createMessage('ai', 'Hi!')];
			const history = createMockHistory(msgs);
			const memory = new WindowedChatMemory(history, { windowSize: 5 });

			const messages = await memory.loadMessages();

			expect(messages).toEqual(msgs);
		});

		it('should return only last N pairs when over window size', async () => {
			const msgs = [
				createMessage('human', 'Message 1'),
				createMessage('ai', 'Response 1'),
				createMessage('human', 'Message 2'),
				createMessage('ai', 'Response 2'),
				createMessage('human', 'Message 3'),
				createMessage('ai', 'Response 3'),
			];
			const history = createMockHistory(msgs);
			const memory = new WindowedChatMemory(history, { windowSize: 2 });

			const messages = await memory.loadMessages();

			// windowSize: 2 means 2 pairs = 4 messages
			expect(messages).toHaveLength(4);
			expect(messages[0].content[0]).toEqual({ type: 'text', text: 'Message 2' });
			expect(messages[1].content[0]).toEqual({ type: 'text', text: 'Response 2' });
			expect(messages[2].content[0]).toEqual({ type: 'text', text: 'Message 3' });
			expect(messages[3].content[0]).toEqual({ type: 'text', text: 'Response 3' });
		});

		it('should use default window size of 10', async () => {
			const history = createMockHistory();
			const memory = new WindowedChatMemory(history);

			// Add 25 messages (more than default 10 pairs = 20 messages)
			const msgs: Message[] = [];
			for (let i = 1; i <= 25; i++) {
				msgs.push(createMessage(i % 2 === 1 ? 'human' : 'ai', `Message ${i}`));
			}
			await history.addMessages(msgs);

			const messages = await memory.loadMessages();

			// Default windowSize: 10 means 10 pairs = 20 messages
			expect(messages).toHaveLength(20);
		});
	});

	describe('saveTurn', () => {
		it('should add human and AI message pair', async () => {
			const history = createMockHistory();
			const memory = new WindowedChatMemory(history, { windowSize: 5 });

			await memory.saveTurn('Hello!', 'Hi there!');

			expect(history.addMessages).toHaveBeenCalledWith([
				{ role: 'human', content: [{ type: 'text', text: 'Hello!' }] },
				{ role: 'ai', content: [{ type: 'text', text: 'Hi there!' }] },
			]);
		});
	});

	describe('clear', () => {
		it('should delegate to chatHistory.clear()', async () => {
			const history = createMockHistory();
			const memory = new WindowedChatMemory(history, { windowSize: 5 });

			await memory.clear();

			expect(history.clear).toHaveBeenCalled();
		});
	});

	describe('chatHistory accessor', () => {
		it('should return the underlying chat history', () => {
			const history = createMockHistory();
			const memory = new WindowedChatMemory(history, { windowSize: 5 });

			expect(memory.chatHistory).toBe(history);
		});
	});
});
