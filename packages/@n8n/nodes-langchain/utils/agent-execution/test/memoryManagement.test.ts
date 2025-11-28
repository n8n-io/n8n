import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, AIMessage, SystemMessage, trimMessages } from '@langchain/core/messages';
import { mock } from 'jest-mock-extended';
import type { BaseChatMemory } from '@langchain/classic/memory';

import { loadMemory, saveToMemory, buildToolContext } from '../memoryManagement';
import type { ToolCallData } from '../types';

jest.mock('@langchain/core/messages', () => ({
	...jest.requireActual('@langchain/core/messages'),
	trimMessages: jest.fn(),
}));

describe('memoryManagement', () => {
	let mockMemory: jest.Mocked<BaseChatMemory>;
	let mockModel: jest.Mocked<BaseChatModel>;

	beforeEach(() => {
		jest.clearAllMocks();
		mockMemory = mock<BaseChatMemory>();
		mockModel = mock<BaseChatModel>();
	});

	describe('loadMemory', () => {
		it('should return undefined when no memory is provided', async () => {
			const result = await loadMemory(undefined);
			expect(result).toBeUndefined();
		});

		it('should load chat history from memory', async () => {
			const chatHistory = [new HumanMessage('Hello'), new AIMessage('Hi there!')];
			mockMemory.loadMemoryVariables.mockResolvedValue({ chat_history: chatHistory });

			const result = await loadMemory(mockMemory);

			expect(result).toEqual(chatHistory);
			expect(mockMemory.loadMemoryVariables).toHaveBeenCalledWith({});
		});

		it('should return empty array when chat_history is not present', async () => {
			mockMemory.loadMemoryVariables.mockResolvedValue({});

			const result = await loadMemory(mockMemory);

			expect(result).toEqual([]);
		});

		it('should trim messages when maxTokens is provided', async () => {
			const chatHistory = [
				new SystemMessage('System prompt'),
				new HumanMessage('Hello'),
				new AIMessage('Hi there!'),
				new HumanMessage('How are you?'),
				new AIMessage('I am doing well!'),
			];
			const trimmedHistory = [
				new SystemMessage('System prompt'),
				new HumanMessage('How are you?'),
				new AIMessage('I am doing well!'),
			];

			mockMemory.loadMemoryVariables.mockResolvedValue({ chat_history: chatHistory });
			(trimMessages as jest.Mock).mockResolvedValue(trimmedHistory);

			const result = await loadMemory(mockMemory, mockModel, 2000);

			expect(result).toEqual(trimmedHistory);
			expect(trimMessages).toHaveBeenCalledWith(chatHistory, {
				strategy: 'last',
				maxTokens: 2000,
				tokenCounter: mockModel,
				includeSystem: true,
				startOn: 'human',
				allowPartial: true,
			});
		});

		it('should not trim messages when maxTokens is not provided', async () => {
			const chatHistory = [new HumanMessage('Hello'), new AIMessage('Hi there!')];
			mockMemory.loadMemoryVariables.mockResolvedValue({ chat_history: chatHistory });

			const result = await loadMemory(mockMemory, mockModel);

			expect(result).toEqual(chatHistory);
			expect(trimMessages).not.toHaveBeenCalled();
		});

		it('should not trim messages when model is not provided', async () => {
			const chatHistory = [new HumanMessage('Hello'), new AIMessage('Hi there!')];
			mockMemory.loadMemoryVariables.mockResolvedValue({ chat_history: chatHistory });

			const result = await loadMemory(mockMemory, undefined, 2000);

			expect(result).toEqual(chatHistory);
			expect(trimMessages).not.toHaveBeenCalled();
		});
	});

	describe('saveToMemory', () => {
		it('should save conversation to memory', async () => {
			const input = 'What is 2+2?';
			const output = 'The answer is 4';

			await saveToMemory(input, output, mockMemory);

			expect(mockMemory.saveContext).toHaveBeenCalledWith({ input }, { output });
		});

		it('should not save when output is empty', async () => {
			const input = 'What is 2+2?';
			const output = '';

			await saveToMemory(input, output, mockMemory);

			expect(mockMemory.saveContext).not.toHaveBeenCalled();
		});

		it('should not save when memory is not provided', async () => {
			const input = 'What is 2+2?';
			const output = 'The answer is 4';

			await saveToMemory(input, output, undefined);

			// Should not throw error
			expect(mockMemory.saveContext).not.toHaveBeenCalled();
		});

		it('should not save when both output and memory are missing', async () => {
			const input = 'What is 2+2?';

			await saveToMemory(input, '', undefined);

			expect(mockMemory.saveContext).not.toHaveBeenCalled();
		});
	});

	describe('buildToolContext', () => {
		it('should build tool context string from single step', () => {
			const steps: ToolCallData[] = [
				{
					action: {
						tool: 'calculator',
						toolInput: { expression: '2+2' },
						log: 'Using calculator',
						toolCallId: 'call_123',
						type: 'tool_call',
					},
					observation: '4',
				},
			];

			const result = buildToolContext(steps);

			expect(result).toBe('Tool: calculator, Input: {"expression":"2+2"}, Result: 4');
		});

		it('should build tool context string from multiple steps', () => {
			const steps: ToolCallData[] = [
				{
					action: {
						tool: 'weather',
						toolInput: { location: 'New York' },
						log: 'Getting weather',
						toolCallId: 'call_123',
						type: 'tool_call',
					},
					observation: 'Sunny, 72°F',
				},
				{
					action: {
						tool: 'time',
						toolInput: { timezone: 'EST' },
						log: 'Getting time',
						toolCallId: 'call_124',
						type: 'tool_call',
					},
					observation: '14:30',
				},
			];

			const result = buildToolContext(steps);

			expect(result).toBe(
				'Tool: weather, Input: {"location":"New York"}, Result: Sunny, 72°F; Tool: time, Input: {"timezone":"EST"}, Result: 14:30',
			);
		});

		it('should return empty string for empty steps array', () => {
			const result = buildToolContext([]);

			expect(result).toBe('');
		});

		it('should handle complex tool inputs', () => {
			const steps: ToolCallData[] = [
				{
					action: {
						tool: 'search',
						toolInput: {
							query: 'typescript testing',
							filters: { language: 'en', date: '2024' },
							limit: 10,
						},
						log: 'Searching',
						toolCallId: 'call_125',
						type: 'tool_call',
					},
					observation: 'Found 10 results',
				},
			];

			const result = buildToolContext(steps);

			expect(result).toBe(
				'Tool: search, Input: {"query":"typescript testing","filters":{"language":"en","date":"2024"},"limit":10}, Result: Found 10 results',
			);
		});
	});
});
