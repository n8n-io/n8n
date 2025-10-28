import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessage, HumanMessage, type BaseMessage } from '@langchain/core/messages';
import { trimMessages } from '@langchain/core/messages';
import { mock } from 'jest-mock-extended';
import type { BaseChatMemory } from 'langchain/memory';

import { loadMemory as loadChatHistory } from '@utils/agent-execution';

jest.mock('@langchain/core/messages', () => ({
	...jest.requireActual('@langchain/core/messages'),
	trimMessages: jest.fn(),
}));

describe('loadChatHistory', () => {
	const mockMemory = mock<BaseChatMemory>();
	const mockModel = mock<BaseChatModel>();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should load chat history from memory without trimming when no maxTokens', async () => {
		const mockHistory: BaseMessage[] = [
			new HumanMessage({ content: 'Hello' }),
			new AIMessage({ content: 'Hi there!' }),
		];

		mockMemory.loadMemoryVariables = jest.fn().mockResolvedValue({
			chat_history: mockHistory,
		});

		const result = await loadChatHistory(mockMemory, mockModel);

		expect(result).toEqual(mockHistory);
		expect(mockMemory.loadMemoryVariables).toHaveBeenCalledWith({});
		expect(trimMessages).not.toHaveBeenCalled();
	});

	it('should load and trim chat history when maxTokensFromMemory is set', async () => {
		const mockHistory: BaseMessage[] = [
			new HumanMessage({ content: 'Hello' }),
			new AIMessage({ content: 'Hi there!' }),
			new HumanMessage({ content: 'How are you?' }),
			new AIMessage({ content: 'I am doing well!' }),
		];

		const trimmedHistory: BaseMessage[] = [
			new HumanMessage({ content: 'How are you?' }),
			new AIMessage({ content: 'I am doing well!' }),
		];

		mockMemory.loadMemoryVariables = jest.fn().mockResolvedValue({
			chat_history: mockHistory,
		});

		(trimMessages as jest.Mock).mockResolvedValue(trimmedHistory);

		const result = await loadChatHistory(mockMemory, mockModel, 100);

		expect(result).toEqual(trimmedHistory);
		expect(mockMemory.loadMemoryVariables).toHaveBeenCalledWith({});
		expect(trimMessages).toHaveBeenCalledWith(mockHistory, {
			strategy: 'last',
			maxTokens: 100,
			tokenCounter: mockModel,
			includeSystem: true,
			startOn: 'human',
			allowPartial: true,
		});
	});

	it('should handle empty chat history', async () => {
		mockMemory.loadMemoryVariables = jest.fn().mockResolvedValue({
			chat_history: [],
		});

		const result = await loadChatHistory(mockMemory, mockModel);

		expect(result).toEqual([]);
		expect(mockMemory.loadMemoryVariables).toHaveBeenCalledWith({});
	});

	it('should use correct trimMessages options', async () => {
		const mockHistory: BaseMessage[] = [
			new HumanMessage({ content: 'Test message 1' }),
			new AIMessage({ content: 'Test response 1' }),
		];

		mockMemory.loadMemoryVariables = jest.fn().mockResolvedValue({
			chat_history: mockHistory,
		});

		(trimMessages as jest.Mock).mockResolvedValue(mockHistory);

		await loadChatHistory(mockMemory, mockModel, 250);

		expect(trimMessages).toHaveBeenCalledWith(
			mockHistory,
			expect.objectContaining({
				strategy: 'last',
				maxTokens: 250,
				tokenCounter: mockModel,
				includeSystem: true,
				startOn: 'human',
				allowPartial: true,
			}),
		);
	});

	it('should not trim when maxTokensFromMemory is 0', async () => {
		const mockHistory: BaseMessage[] = [
			new HumanMessage({ content: 'Hello' }),
			new AIMessage({ content: 'Hi there!' }),
		];

		mockMemory.loadMemoryVariables = jest.fn().mockResolvedValue({
			chat_history: mockHistory,
		});

		const result = await loadChatHistory(mockMemory, mockModel, 0);

		// 0 is falsy, so trimMessages should not be called
		expect(trimMessages).not.toHaveBeenCalled();
		expect(result).toEqual(mockHistory);
	});

	it('should pass through the model to trimMessages for token counting', async () => {
		const mockHistory: BaseMessage[] = [new HumanMessage({ content: 'Test message' })];

		mockMemory.loadMemoryVariables = jest.fn().mockResolvedValue({
			chat_history: mockHistory,
		});

		(trimMessages as jest.Mock).mockResolvedValue(mockHistory);

		await loadChatHistory(mockMemory, mockModel, 100);

		const trimMessagesCall = (trimMessages as jest.Mock).mock.calls[0][1];
		expect(trimMessagesCall.tokenCounter).toBe(mockModel);
	});
});
