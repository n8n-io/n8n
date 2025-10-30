import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { mock } from 'jest-mock-extended';
import { createToolCallingAgent } from 'langchain/agents';
import type { Tool } from 'langchain/tools';

import * as commonHelpers from '../../../common';
import { createAgentSequence } from '../createAgentSequence';

jest.mock('langchain/agents', () => ({
	createToolCallingAgent: jest.fn(),
}));

jest.mock('@langchain/core/runnables', () => ({
	RunnableSequence: {
		from: jest.fn(),
	},
}));

jest.mock('../../../common', () => ({
	getAgentStepsParser: jest.fn(),
	fixEmptyContentMessage: jest.fn(),
}));

describe('createAgentSequence', () => {
	const mockModel = mock<BaseChatModel>();
	const mockPrompt = mock<ChatPromptTemplate>();
	const mockTool = mock<Tool>();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should create agent sequence without fallback', () => {
		const mockAgent = mock<any>();
		const mockRunnableSequence = mock<any>();
		const mockStepsParser = jest.fn();

		(createToolCallingAgent as jest.Mock).mockReturnValue(mockAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);
		jest.spyOn(commonHelpers, 'getAgentStepsParser').mockReturnValue(mockStepsParser);

		const options = { maxIterations: 10, returnIntermediateSteps: false };
		const result = createAgentSequence(mockModel, [mockTool], mockPrompt, options);

		expect(createToolCallingAgent).toHaveBeenCalledWith({
			llm: mockModel,
			tools: [mockTool],
			prompt: mockPrompt,
			streamRunnable: false,
		});

		expect(RunnableSequence.from).toHaveBeenCalledWith([
			mockAgent,
			mockStepsParser,
			commonHelpers.fixEmptyContentMessage,
		]);

		expect(result.singleAction).toBe(true);
		expect(result.streamRunnable).toBe(false);
	});

	it('should create agent sequence with fallback model', () => {
		const mockFallbackModel = mock<BaseChatModel>();
		const mockAgent = mock<any>();
		const mockFallbackAgent = mock<any>();
		const mockAgentWithFallback = mock<any>();
		const mockRunnableSequence = mock<any>();
		const mockStepsParser = jest.fn();

		mockAgent.withFallbacks = jest.fn().mockReturnValue(mockAgentWithFallback);

		(createToolCallingAgent as jest.Mock)
			.mockReturnValueOnce(mockAgent)
			.mockReturnValueOnce(mockFallbackAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);
		jest.spyOn(commonHelpers, 'getAgentStepsParser').mockReturnValue(mockStepsParser);

		const options = { maxIterations: 10, returnIntermediateSteps: false };
		createAgentSequence(
			mockModel,
			[mockTool],
			mockPrompt,
			options,
			undefined,
			undefined,
			mockFallbackModel,
		);

		expect(createToolCallingAgent).toHaveBeenCalledTimes(2);
		expect(createToolCallingAgent).toHaveBeenNthCalledWith(1, {
			llm: mockModel,
			tools: [mockTool],
			prompt: mockPrompt,
			streamRunnable: false,
		});
		expect(createToolCallingAgent).toHaveBeenNthCalledWith(2, {
			llm: mockFallbackModel,
			tools: [mockTool],
			prompt: mockPrompt,
			streamRunnable: false,
		});

		expect(mockAgent.withFallbacks).toHaveBeenCalledWith([mockFallbackAgent]);

		expect(RunnableSequence.from).toHaveBeenCalledWith([
			mockAgentWithFallback,
			mockStepsParser,
			commonHelpers.fixEmptyContentMessage,
		]);
	});

	it('should pass output parser to getAgentStepsParser', () => {
		const mockAgent = mock<any>();
		const mockRunnableSequence = mock<any>();
		const mockOutputParser = mock<any>();
		const mockStepsParser = jest.fn();

		(createToolCallingAgent as jest.Mock).mockReturnValue(mockAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);
		jest.spyOn(commonHelpers, 'getAgentStepsParser').mockReturnValue(mockStepsParser);

		const options = { maxIterations: 10, returnIntermediateSteps: false };
		createAgentSequence(mockModel, [mockTool], mockPrompt, options, mockOutputParser);

		expect(commonHelpers.getAgentStepsParser).toHaveBeenCalledWith(mockOutputParser, undefined);
	});

	it('should pass memory to getAgentStepsParser', () => {
		const mockAgent = mock<any>();
		const mockRunnableSequence = mock<any>();
		const mockMemory = mock<any>();
		const mockStepsParser = jest.fn();

		(createToolCallingAgent as jest.Mock).mockReturnValue(mockAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);
		jest.spyOn(commonHelpers, 'getAgentStepsParser').mockReturnValue(mockStepsParser);

		const options = { maxIterations: 10, returnIntermediateSteps: false };
		createAgentSequence(mockModel, [mockTool], mockPrompt, options, undefined, mockMemory);

		expect(commonHelpers.getAgentStepsParser).toHaveBeenCalledWith(undefined, mockMemory);
	});

	it('should set streamRunnable to false for agents', () => {
		const mockAgent = mock<any>();
		const mockRunnableSequence = mock<any>();
		const mockStepsParser = jest.fn();

		(createToolCallingAgent as jest.Mock).mockReturnValue(mockAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);
		jest.spyOn(commonHelpers, 'getAgentStepsParser').mockReturnValue(mockStepsParser);

		const options = { maxIterations: 10, returnIntermediateSteps: false };
		createAgentSequence(mockModel, [mockTool], mockPrompt, options);

		expect(createToolCallingAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				streamRunnable: false,
			}),
		);
	});

	it('should handle null fallback model', () => {
		const mockAgent = mock<any>();
		const mockRunnableSequence = mock<any>();
		const mockStepsParser = jest.fn();

		(createToolCallingAgent as jest.Mock).mockReturnValue(mockAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);
		jest.spyOn(commonHelpers, 'getAgentStepsParser').mockReturnValue(mockStepsParser);

		const options = { maxIterations: 10, returnIntermediateSteps: false };
		createAgentSequence(mockModel, [mockTool], mockPrompt, options, undefined, undefined, null);

		// Should only create one agent (no fallback)
		expect(createToolCallingAgent).toHaveBeenCalledTimes(1);
		expect(RunnableSequence.from).toHaveBeenCalledWith([
			mockAgent,
			mockStepsParser,
			commonHelpers.fixEmptyContentMessage,
		]);
	});

	it('should create sequence with multiple tools', () => {
		const mockAgent = mock<any>();
		const mockRunnableSequence = mock<any>();
		const mockTool2 = mock<Tool>();
		const mockStepsParser = jest.fn();

		(createToolCallingAgent as jest.Mock).mockReturnValue(mockAgent);
		(RunnableSequence.from as jest.Mock).mockReturnValue(mockRunnableSequence);
		jest.spyOn(commonHelpers, 'getAgentStepsParser').mockReturnValue(mockStepsParser);

		const options = { maxIterations: 10, returnIntermediateSteps: false };
		createAgentSequence(mockModel, [mockTool, mockTool2], mockPrompt, options);

		expect(createToolCallingAgent).toHaveBeenCalledWith(
			expect.objectContaining({
				tools: [mockTool, mockTool2],
			}),
		);
	});
});
