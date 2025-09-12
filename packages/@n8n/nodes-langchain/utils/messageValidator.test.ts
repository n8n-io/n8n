import { HumanMessage, AIMessage } from '@langchain/core/messages';
import {
	validateAndFixHumanMessage,
	validateMessages,
	getCacheStats,
	resetCacheStats,
	wrapMemoryWithValidation,
	wrapMemoryWithStorageValidation,
} from './messageValidator';

describe('MessageValidator', () => {
	beforeEach(() => {
		resetCacheStats();
	});

	describe('validateAndFixHumanMessage', () => {
		it('should return the original message if content is valid', () => {
			const message = new HumanMessage({ content: 'Hello world' });
			const result = validateAndFixHumanMessage(message);

			expect(result).toBe(message);
			expect(result.content).toBe('Hello world');
		});

		it('should fix HumanMessage with undefined content', () => {
			const message = new HumanMessage({ content: undefined as any });
			const result = validateAndFixHumanMessage(message);

			expect(result).not.toBe(message);
			expect(result.content).toBe('');
			expect(result).toBeInstanceOf(HumanMessage);
		});

		it('should fix HumanMessage with null content', () => {
			const message = new HumanMessage({ content: null as any });
			const result = validateAndFixHumanMessage(message);

			expect(result).not.toBe(message);
			expect(result.content).toBe('');
		});

		it('should extract content from messages array', () => {
			const messageWithMessages = new HumanMessage({ content: undefined as any });
			(messageWithMessages as any).messages = [{ text: 'Hello' }, 'world', { content: 'test' }];

			const result = validateAndFixHumanMessage(messageWithMessages);

			expect(result.content).toBe('Hello world test');
		});

		it('should handle empty messages array gracefully', () => {
			const messageWithEmptyMessages = new HumanMessage({ content: undefined as any });
			(messageWithEmptyMessages as any).messages = [];

			const result = validateAndFixHumanMessage(messageWithEmptyMessages);

			expect(result.content).toBe('');
		});

		it('should ensure additional_kwargs is always an object', () => {
			const message = new HumanMessage({ content: null as any });
			// Simulate a message without additional_kwargs
			delete (message as any).additional_kwargs;

			const result = validateAndFixHumanMessage(message);

			expect(result.additional_kwargs).toEqual({});
		});

		it('should recover content from lc_kwargs for MongoDB', () => {
			const messageWithKwargs = new HumanMessage({ content: null as any });
			(messageWithKwargs as any).lc_kwargs = [
				{ role: 'user', content: 'Recovered content' },
				{ role: 'system', content: 'System message' },
			];

			const result = validateAndFixHumanMessage(messageWithKwargs);

			expect(result.content).toBe('Recovered content');
		});

		it('should handle non-human messages unchanged', () => {
			const aiMessage = new AIMessage({ content: 'AI response' });
			const result = validateAndFixHumanMessage(aiMessage);

			expect(result).toBe(aiMessage);
		});

		it('should handle null/undefined messages', () => {
			expect(validateAndFixHumanMessage(null as any)).toBe(null);
			expect(validateAndFixHumanMessage(undefined as any)).toBe(undefined);
		});
	});

	describe('validateMessages', () => {
		it('should validate an array of messages', () => {
			const messages = [
				new HumanMessage({ content: 'Valid message' }),
				new HumanMessage({ content: null as any }),
				new AIMessage({ content: 'AI response' }),
			];

			const result = validateMessages(messages);

			expect(result).toHaveLength(3);
			expect(result[0].content).toBe('Valid message');
			expect(result[1].content).toBe('');
			expect(result[2].content).toBe('AI response');
		});

		it('should handle non-array input', () => {
			const nonArray = 'not an array' as any;
			const result = validateMessages(nonArray);

			expect(result).toBe(nonArray);
		});
	});

	describe('caching', () => {
		it('should cache validation results', () => {
			const message = new HumanMessage({ content: 'Test message' });

			// First call
			const result1 = validateAndFixHumanMessage(message);
			const stats1 = getCacheStats();

			// Second call should hit cache
			const result2 = validateAndFixHumanMessage(message);
			const stats2 = getCacheStats();

			expect(result1).toBe(result2);
			expect(stats1.misses).toBe(1);
			expect(stats1.hits).toBe(0);
			expect(stats2.misses).toBe(1);
			expect(stats2.hits).toBe(1);
			expect(stats2.hitRate).toBe(0.5);
		});

		it('should cache fixed messages', () => {
			const message = new HumanMessage({ content: null as any });

			// First call
			const result1 = validateAndFixHumanMessage(message);

			// Second call should return cached fixed message
			const result2 = validateAndFixHumanMessage(message);

			expect(result1).toBe(result2);
			expect(result1.content).toBe('');
		});

		it('should reset cache stats', () => {
			const message = new HumanMessage({ content: 'Test' });
			validateAndFixHumanMessage(message);

			let stats = getCacheStats();
			expect(stats.misses).toBe(1);

			resetCacheStats();
			stats = getCacheStats();
			expect(stats.misses).toBe(0);
			expect(stats.hits).toBe(0);
		});
	});

	describe('wrapMemoryWithValidation', () => {
		let mockMemory: any;
		let mockChatHistory: any;

		beforeEach(() => {
			mockChatHistory = {
				getMessages: jest.fn(),
			};
			mockMemory = {
				chatHistory: mockChatHistory,
			};
		});

		it('should wrap memory and validate messages on retrieval', async () => {
			const invalidMessage = new HumanMessage({ content: null as any });
			const validMessage = new HumanMessage({ content: 'Valid content' });
			mockChatHistory.getMessages.mockResolvedValue([invalidMessage, validMessage]);

			const wrappedMemory = wrapMemoryWithValidation(mockMemory);
			const messages = await wrappedMemory.chatHistory.getMessages();

			expect(messages).toHaveLength(2);
			expect(messages[0].content).toBe(''); // Fixed null content
			expect(messages[1].content).toBe('Valid content'); // Unchanged
		});

		it('should handle non-array return values', async () => {
			const nonArrayResult = 'not an array';
			mockChatHistory.getMessages.mockResolvedValue(nonArrayResult);

			const wrappedMemory = wrapMemoryWithValidation(mockMemory);
			const result = await wrappedMemory.chatHistory.getMessages();

			expect(result).toBe(nonArrayResult);
		});

		it('should handle errors with fallback enabled', async () => {
			const error = new Error('Test error');
			let callCount = 0;
			mockChatHistory.getMessages.mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					throw error;
				}
				return Promise.resolve([]);
			});

			const wrappedMemory = wrapMemoryWithValidation(mockMemory, {
				fallbackOnError: true,
			});

			const result = await wrappedMemory.chatHistory.getMessages();
			expect(result).toEqual([]);
			expect(callCount).toBe(2);
		});

		it('should re-throw errors when fallback is disabled', async () => {
			const error = new Error('Test error');
			mockChatHistory.getMessages.mockRejectedValue(error);

			const wrappedMemory = wrapMemoryWithValidation(mockMemory, {
				fallbackOnError: false,
			});

			await expect(wrappedMemory.chatHistory.getMessages()).rejects.toThrow('Test error');
		});

		it('should return memory unchanged if getMessages is not a function', () => {
			const memoryWithoutFunction = {
				chatHistory: { getMessages: 'not a function' },
			};

			const result = wrapMemoryWithValidation(memoryWithoutFunction as any);
			expect(result).toBe(memoryWithoutFunction);
		});
	});

	describe('wrapMemoryWithStorageValidation', () => {
		let mockMemory: any;
		let mockChatHistory: any;

		beforeEach(() => {
			mockChatHistory = {
				getMessages: jest.fn(),
				addMessage: jest.fn(),
			};
			mockMemory = {
				chatHistory: mockChatHistory,
			};
		});

		it('should validate messages before adding to memory', async () => {
			const invalidMessage = new HumanMessage({ content: null as any });
			let capturedMessage: any;
			mockChatHistory.addMessage.mockImplementation((message) => {
				capturedMessage = message;
				return Promise.resolve();
			});

			const wrappedMemory = wrapMemoryWithStorageValidation(mockMemory);
			await wrappedMemory.chatHistory.addMessage(invalidMessage);

			expect(capturedMessage).toEqual(
				expect.objectContaining({
					content: '', // Should be fixed to empty string
				}),
			);
			expect(capturedMessage.content).toBe('');
		});

		it('should handle memory without addMessage method', () => {
			const memoryWithoutAdd = {
				chatHistory: { getMessages: jest.fn() },
			};

			const result = wrapMemoryWithStorageValidation(memoryWithoutAdd as any);
			expect(result).toBe(memoryWithoutAdd);
		});

		it('should handle MongoDB direct fix when enabled', async () => {
			const mockCollection = {
				find: jest.fn().mockReturnValue({
					toArray: jest.fn().mockResolvedValue([]),
				}),
			};

			const mongoMemory = {
				chatHistory: {
					getMessages: jest.fn().mockResolvedValue([]),
					collection: mockCollection,
					sessionId: 'test-session',
				},
			};

			const wrappedMemory = wrapMemoryWithStorageValidation(mongoMemory as any, {
				enableDirectDbFix: true,
			});

			await wrappedMemory.chatHistory.getMessages();
			expect(mockCollection.find).toHaveBeenCalledWith({
				sessionId: 'test-session',
			});
		});

		it('should fix problematic MongoDB data directly', async () => {
			const problematicMessages = [
				{
					_id: 'msg1',
					data: {
						content: null,
						additional_kwargs: null,
						kwargs: { content: 'Recovered content' },
					},
				},
				{
					_id: 'msg2',
					data: {
						content: null,
						additional_kwargs: {},
						text: 'Alternative content',
					},
				},
			];

			const mockCollection = {
				find: jest.fn().mockReturnValue({
					toArray: jest.fn().mockResolvedValue(problematicMessages),
				}),
				updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
			};

			const mongoMemory = {
				chatHistory: {
					getMessages: jest.fn().mockResolvedValue([]),
					collection: mockCollection,
					sessionId: 'test-session',
				},
			};

			const wrappedMemory = wrapMemoryWithStorageValidation(mongoMemory as any, {
				enableDirectDbFix: true,
			});

			await wrappedMemory.chatHistory.getMessages();

			// Should fix both messages
			expect(mockCollection.updateOne).toHaveBeenCalledTimes(2);

			// First message: fix content from kwargs and additional_kwargs
			expect(mockCollection.updateOne).toHaveBeenCalledWith(
				{ _id: 'msg1' },
				{
					$set: {
						'data.additional_kwargs': {},
						'data.content': 'Recovered content',
					},
				},
			);

			// Second message: fix content from text field
			expect(mockCollection.updateOne).toHaveBeenCalledWith(
				{ _id: 'msg2' },
				{
					$set: {
						'data.content': 'Alternative content',
					},
				},
			);
		});

		it('should handle errors during MongoDB direct fix gracefully', async () => {
			const mockCollection = {
				find: jest.fn().mockReturnValue({
					toArray: jest.fn().mockRejectedValue(new Error('DB error')),
				}),
			};

			const mongoMemory = {
				chatHistory: {
					getMessages: jest.fn().mockResolvedValue([]),
					collection: mockCollection,
					sessionId: 'test-session',
				},
			};

			const wrappedMemory = wrapMemoryWithStorageValidation(mongoMemory as any, {
				enableDirectDbFix: true,
			});

			// Should not throw error, should gracefully continue
			const result = await wrappedMemory.chatHistory.getMessages();
			expect(result).toEqual([]);
		});
	});
});
