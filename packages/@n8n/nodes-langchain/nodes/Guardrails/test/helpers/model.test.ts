import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AgentExecutor } from 'langchain/agents';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { GuardrailError } from '../../actions/types';
import { getChatModel, runLLMValidation } from '../../helpers/model';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';

jest.mock('@langchain/core/prompts', () => ({
	ChatPromptTemplate: {
		fromMessages: jest.fn(() => ({
			format: jest.fn(),
			pipe: jest.fn().mockReturnValue({
				pipe: jest.fn().mockReturnValue({
					invoke: jest.fn(),
				}),
			}),
		})),
	},
}));

jest.mock('langchain/agents', () => ({
	AgentExecutor: jest.fn().mockImplementation(() => ({
		invoke: jest.fn(),
	})),
	createToolCallingAgent: jest.fn(() => ({
		streamRunnable: false,
	})),
}));

jest.mock('@langchain/core/output_parsers', () => ({
	StructuredOutputParser: jest.fn().mockImplementation(() => ({
		invoke: jest.fn(),
		getFormatInstructions: jest.fn().mockReturnValue('Format instructions'),
	})),
	OutputParserException: jest.fn().mockImplementation((message) => ({
		message,
		name: 'OutputParserException',
	})),
}));

describe('model helper', () => {
	let mockExecuteFunctions: IExecuteFunctions;
	let mockModel: BaseChatModel;

	beforeEach(() => {
		mockModel = {
			invoke: jest.fn(),
		} as any;

		mockExecuteFunctions = {
			getInputConnectionData: jest.fn(),
		} as any;
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('getChatModel', () => {
		it('should return model when getInputConnectionData returns a single model', async () => {
			(mockExecuteFunctions.getInputConnectionData as jest.Mock).mockResolvedValue(mockModel);

			const result = await getChatModel.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.getInputConnectionData).toHaveBeenCalledWith(
				NodeConnectionTypes.AiLanguageModel,
				0,
			);
			expect(result).toBe(mockModel);
		});

		it('should return first model when getInputConnectionData returns an array', async () => {
			const models = [mockModel, {} as BaseChatModel];
			(mockExecuteFunctions.getInputConnectionData as jest.Mock).mockResolvedValue(models);

			const result = await getChatModel.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.getInputConnectionData).toHaveBeenCalledWith(
				NodeConnectionTypes.AiLanguageModel,
				0,
			);
			expect(result).toBe(mockModel);
		});

		it('should handle empty array from getInputConnectionData', async () => {
			(mockExecuteFunctions.getInputConnectionData as jest.Mock).mockResolvedValue([]);

			const result = await getChatModel.call(mockExecuteFunctions);

			expect(result).toBeUndefined();
		});
	});

	describe('runLLMValidation', () => {
		it('should return failed GuardrailResult when agent execution fails', async () => {
			const mockAgentExecutor = {
				invoke: jest.fn().mockRejectedValue(new Error('Agent execution failed')),
			};

			jest
				.mocked((await import('langchain/agents')).AgentExecutor)
				.mockImplementation(() => mockAgentExecutor as unknown as AgentExecutor);

			const result = await runLLMValidation('test-guardrail', 'Test input', {
				model: mockModel,
				prompt: 'Test prompt',
				threshold: 0.5,
			});

			expect(result).toEqual({
				guardrailName: 'test-guardrail',
				tripwireTriggered: true,
				executionFailed: true,
				originalException: expect.any(GuardrailError),
				info: {},
			});

			expect(result.originalException).toBeInstanceOf(GuardrailError);
			expect((result.originalException as GuardrailError).guardrailName).toBe('test-guardrail');
		});

		it('should return failed GuardrailResult when agent does not call tool', async () => {
			const mockAgentExecutor = {
				invoke: jest.fn().mockResolvedValue({}), // No tool call
			};

			jest
				.mocked((await import('langchain/agents')).AgentExecutor)
				.mockImplementation(() => mockAgentExecutor as unknown as AgentExecutor);

			const result = await runLLMValidation('test-guardrail', 'Test input', {
				model: mockModel,
				prompt: 'Test prompt',
				threshold: 0.5,
			});

			expect(result).toEqual({
				guardrailName: 'test-guardrail',
				tripwireTriggered: true,
				executionFailed: true,
				originalException: expect.any(GuardrailError),
				info: {},
			});
		});

		it('should use provided systemMessage instead of default rules', async () => {
			const invokeMock = jest.fn().mockResolvedValue({
				content: [{ type: 'text', text: '{"confidenceScore":0.6,"flagged":true}' }],
			});
			jest.mocked(ChatPromptTemplate.fromMessages).mockImplementationOnce(
				() =>
					({
						pipe: jest.fn().mockReturnValue({ invoke: invokeMock }),
					}) as unknown as any,
			);

			jest.mocked(StructuredOutputParser).mockImplementationOnce(
				() =>
					({
						getFormatInstructions: jest.fn().mockReturnValue('Format instructions'),
						parse: jest.fn().mockResolvedValue({ confidenceScore: 0.6, flagged: true }),
					}) as unknown as any,
			);

			const model = { invoke: jest.fn() } as unknown as BaseChatModel;
			await runLLMValidation('test-guardrail', 'Input text', {
				model,
				prompt: 'System Prompt',
				threshold: 0.5,
				systemMessage: 'CUSTOM_RULES',
			});

			expect(invokeMock).toHaveBeenCalled();
			const callArg = invokeMock.mock.calls[0][0];
			expect(callArg.system_message).toContain('CUSTOM_RULES');
			expect(callArg.system_message).not.toContain('Only respond with the json object');
		});
	});
});
