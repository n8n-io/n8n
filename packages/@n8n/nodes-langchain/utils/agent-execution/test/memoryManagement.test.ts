import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
	HumanMessage,
	AIMessage,
	SystemMessage,
	ToolMessage,
	trimMessages,
} from '@langchain/core/messages';
import { mock } from 'jest-mock-extended';
import type { BaseChatMemory } from '@langchain/classic/memory';

import {
	loadMemory,
	saveToMemory,
	buildToolContext,
	extractToolCallId,
	buildMessagesFromSteps,
} from '../memoryManagement';
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

		it('should remove orphaned ToolMessage at start of chat history', async () => {
			// Simulates memory trimming that removed the AIMessage but left the ToolMessage
			const chatHistory = [
				new ToolMessage({ content: 'Result', tool_call_id: 'orphaned-id', name: 'tool' }),
				new HumanMessage('Next question'),
				new AIMessage('Answer'),
			];
			mockMemory.loadMemoryVariables.mockResolvedValue({ chat_history: chatHistory });

			const result = await loadMemory(mockMemory);

			expect(result).toHaveLength(2);
			expect(result?.[0]).toBeInstanceOf(HumanMessage);
			expect(result?.[1]).toBeInstanceOf(AIMessage);
		});

		it('should remove orphaned AIMessage with tool_calls at start', async () => {
			// Simulates memory trimming that kept AIMessage with tool_calls but removed the ToolMessage
			const orphanedAI = new AIMessage({
				content: 'Calling tool',
				tool_calls: [{ id: 'call-123', name: 'tool', args: {}, type: 'tool_call' }],
			});
			const chatHistory = [orphanedAI, new HumanMessage('Next question'), new AIMessage('Answer')];
			mockMemory.loadMemoryVariables.mockResolvedValue({ chat_history: chatHistory });

			const result = await loadMemory(mockMemory);

			expect(result).toHaveLength(2);
			expect(result?.[0]).toBeInstanceOf(HumanMessage);
			expect(result?.[1]).toBeInstanceOf(AIMessage);
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

	describe('extractToolCallId', () => {
		beforeEach(() => {
			// Mock Date.now() to return consistent values for synthetic IDs
			jest.spyOn(Date, 'now').mockReturnValue(1234567890);
			jest.spyOn(console, 'log').mockImplementation();
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		it('should extract string ID directly', () => {
			const result = extractToolCallId('call-123', 'calculator');
			expect(result).toBe('call-123');
		});

		it('should extract ID from object with id property', () => {
			const result = extractToolCallId({ id: 'call-456' }, 'search');
			expect(result).toBe('call-456');
		});

		it('should extract ID from array', () => {
			const result = extractToolCallId(['call-789'], 'weather');
			expect(result).toBe('call-789');
		});

		it('should recursively extract from nested array', () => {
			const result = extractToolCallId([['call-nested']], 'tool');
			expect(result).toBe('call-nested');
		});

		it('should extract from array of objects', () => {
			const result = extractToolCallId([{ id: 'call-array-obj' }], 'tool');
			expect(result).toBe('call-array-obj');
		});

		it('should generate synthetic ID for null', () => {
			const result = extractToolCallId(null, 'unknown');
			expect(result).toBe('synthetic_unknown_1234567890');
		});

		it('should generate synthetic ID for undefined', () => {
			const result = extractToolCallId(undefined, 'test');
			expect(result).toBe('synthetic_test_1234567890');
		});

		it('should generate synthetic ID for empty string', () => {
			const result = extractToolCallId('', 'tool');
			expect(result).toBe('synthetic_tool_1234567890');
		});

		it('should generate synthetic ID for object without id property', () => {
			const result = extractToolCallId({ other: 'value' }, 'tool');
			expect(result).toBe('synthetic_tool_1234567890');
		});

		it('should generate synthetic ID for empty array', () => {
			const result = extractToolCallId([], 'tool');
			expect(result).toBe('synthetic_tool_1234567890');
		});
	});

	describe('buildMessagesFromSteps', () => {
		beforeEach(() => {
			jest.spyOn(console, 'log').mockImplementation();
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		it('should build messages with proper AIMessage from messageLog', () => {
			const aiMessage = new AIMessage({
				content: 'Let me calculate that',
				tool_calls: [
					{
						id: 'call-123',
						name: 'calculator',
						args: { expression: '2+2' },
						type: 'tool_call',
					},
				],
			});

			const steps: ToolCallData[] = [
				{
					action: {
						tool: 'calculator',
						toolInput: { expression: '2+2' },
						log: 'Using calculator',
						messageLog: [aiMessage],
						toolCallId: 'call-123',
						type: 'tool_call',
					},
					observation: '4',
				},
			];

			const result = buildMessagesFromSteps(steps);

			expect(result).toHaveLength(2);
			expect(result[0]).toBe(aiMessage);
			expect(result[1]).toBeInstanceOf(ToolMessage);
			expect(result[1].content).toBe('4');
			expect((result[1] as ToolMessage).tool_call_id).toBe('call-123');
			expect((result[1] as ToolMessage).name).toBe('calculator');
		});

		it('should create synthetic AIMessage when messageLog is missing', () => {
			const steps: ToolCallData[] = [
				{
					action: {
						tool: 'search',
						toolInput: { query: 'test' },
						log: 'Searching',
						toolCallId: 'call-456',
						type: 'tool_call',
					},
					observation: 'Found results',
				},
			];

			const result = buildMessagesFromSteps(steps);

			expect(result).toHaveLength(2);
			expect(result[0]).toBeInstanceOf(AIMessage);
			expect(result[0].content).toContain('search');
			expect(result[0].content).toContain('test');
			expect((result[0] as AIMessage).tool_calls).toHaveLength(1);
			expect((result[0] as AIMessage).tool_calls?.[0].id).toBe('call-456');
		});

		it('should handle multiple tool calls in sequence', () => {
			const aiMessage1 = new AIMessage({
				content: 'Checking weather',
				tool_calls: [
					{ id: 'call-1', name: 'weather', args: { location: 'NYC' }, type: 'tool_call' },
				],
			});

			const aiMessage2 = new AIMessage({
				content: 'Getting time',
				tool_calls: [{ id: 'call-2', name: 'time', args: { timezone: 'EST' }, type: 'tool_call' }],
			});

			const steps: ToolCallData[] = [
				{
					action: {
						tool: 'weather',
						toolInput: { location: 'NYC' },
						log: 'Weather',
						messageLog: [aiMessage1],
						toolCallId: 'call-1',
						type: 'tool_call',
					},
					observation: 'Sunny, 72°F',
				},
				{
					action: {
						tool: 'time',
						toolInput: { timezone: 'EST' },
						log: 'Time',
						messageLog: [aiMessage2],
						toolCallId: 'call-2',
						type: 'tool_call',
					},
					observation: '14:30',
				},
			];

			const result = buildMessagesFromSteps(steps);

			expect(result).toHaveLength(4);
			expect(result[0]).toBe(aiMessage1);
			expect(result[1]).toBeInstanceOf(ToolMessage);
			expect(result[2]).toBe(aiMessage2);
			expect(result[3]).toBeInstanceOf(ToolMessage);
		});

		it('should return empty array for empty steps', () => {
			const result = buildMessagesFromSteps([]);
			expect(result).toHaveLength(0);
		});
	});

	describe('saveToMemory with steps (message-based storage)', () => {
		let mockChatHistory: any;

		beforeEach(() => {
			jest.spyOn(console, 'log').mockImplementation();
			mockChatHistory = {
				addMessages: jest.fn().mockResolvedValue(undefined),
			};
			mockMemory.chatHistory = mockChatHistory;
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		it('should use message-based storage when steps are provided and addMessages is available', async () => {
			const aiMessage = new AIMessage({
				content: 'Let me calculate',
				tool_calls: [
					{ id: 'call-123', name: 'calculator', args: { expression: '2+2' }, type: 'tool_call' },
				],
			});

			const steps: ToolCallData[] = [
				{
					action: {
						tool: 'calculator',
						toolInput: { expression: '2+2' },
						log: 'Calc',
						messageLog: [aiMessage],
						toolCallId: 'call-123',
						type: 'tool_call',
					},
					observation: '4',
				},
			];

			await saveToMemory('Calculate 2+2', 'The answer is 4', mockMemory, steps);

			expect(mockChatHistory.addMessages).toHaveBeenCalledTimes(1);
			const savedMessages = mockChatHistory.addMessages.mock.calls[0][0];

			expect(savedMessages).toHaveLength(4);
			expect(savedMessages[0]).toBeInstanceOf(HumanMessage);
			expect(savedMessages[0].content).toBe('Calculate 2+2');
			expect(savedMessages[1]).toBe(aiMessage);
			expect(savedMessages[2]).toBeInstanceOf(ToolMessage);
			expect(savedMessages[3]).toBeInstanceOf(AIMessage);
			expect(savedMessages[3].content).toBe('The answer is 4');
		});

		it('should fall back to string format when addMessages is not available', async () => {
			// Create a chat history object without addMessages method
			mockMemory.chatHistory = {} as any;

			const steps: ToolCallData[] = [
				{
					action: {
						tool: 'calculator',
						toolInput: { expression: '2+2' },
						log: 'Calc',
						toolCallId: 'call-123',
						type: 'tool_call',
					},
					observation: '4',
				},
			];

			await saveToMemory('Calculate 2+2', 'The answer is 4', mockMemory, steps);

			expect(mockMemory.saveContext).toHaveBeenCalledWith(
				{ input: 'Calculate 2+2' },
				{
					output:
						'[Used tools: Tool: calculator, Input: {"expression":"2+2"}, Result: 4] The answer is 4',
				},
			);
		});

		it('should use saveContext when steps array is empty', async () => {
			await saveToMemory('Simple question', 'Simple answer', mockMemory, []);

			expect(mockMemory.saveContext).toHaveBeenCalledWith(
				{ input: 'Simple question' },
				{ output: 'Simple answer' },
			);
			expect(mockChatHistory.addMessages).not.toHaveBeenCalled();
		});

		it('should use saveContext when steps is undefined', async () => {
			await saveToMemory('Simple question', 'Simple answer', mockMemory);

			expect(mockMemory.saveContext).toHaveBeenCalledWith(
				{ input: 'Simple question' },
				{ output: 'Simple answer' },
			);
			expect(mockChatHistory.addMessages).not.toHaveBeenCalled();
		});

		it('should use saveContext when all steps are from previous turns', async () => {
			const aiMessage = new AIMessage({
				content: 'Using tool',
				tool_calls: [{ id: 'call-123', name: 'calculator', args: {}, type: 'tool_call' }],
			});

			const steps: ToolCallData[] = [
				{
					action: {
						tool: 'calculator',
						toolInput: { expression: '2+2' },
						log: 'Calc',
						messageLog: [aiMessage],
						toolCallId: 'call-123',
						type: 'tool_call',
					},
					observation: '4',
				},
			];

			// All steps are from previous turns (previousStepsCount = 1)
			await saveToMemory('New question', 'New answer', mockMemory, steps, 1);

			expect(mockMemory.saveContext).toHaveBeenCalledWith(
				{ input: 'New question' },
				{ output: 'New answer' },
			);
			expect(mockChatHistory.addMessages).not.toHaveBeenCalled();
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
