import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AgentExecutor } from '@langchain/classic/agents';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { GuardrailError } from '../../actions/types';
import { getChatModel, runLLMValidation } from '../../helpers/model';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredOutputParser } from '@langchain/core/output_parsers';

vi.mock('@langchain/core/prompts', () => ({
	ChatPromptTemplate: {
		fromMessages: vi.fn(() => ({
			format: vi.fn(),
			pipe: vi.fn().mockReturnValue({
				pipe: vi.fn().mockReturnValue({
					invoke: vi.fn(),
				}),
			}),
		})),
	},
}));

vi.mock('@langchain/classic/agents', () => ({
	AgentExecutor: vi.fn().mockImplementation(() => ({
		invoke: vi.fn(),
	})),
	createToolCallingAgent: vi.fn(() => ({
		streamRunnable: false,
	})),
}));

vi.mock('@langchain/core/output_parsers', () => ({
	StructuredOutputParser: vi.fn().mockImplementation(() => ({
		invoke: vi.fn(),
		getFormatInstructions: vi.fn().mockReturnValue('Format instructions'),
	})),
	OutputParserException: vi.fn().mockImplementation((message) => ({
		message,
		name: 'OutputParserException',
	})),
}));

describe('model helper', () => {
	let mockExecuteFunctions: IExecuteFunctions;
	let mockModel: BaseChatModel;

	beforeEach(() => {
		mockModel = {
			invoke: vi.fn(),
		} as any;

		mockExecuteFunctions = {
			getInputConnectionData: vi.fn(),
		} as any;
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('getChatModel', () => {
		it('should return model when getInputConnectionData returns a single model', async () => {
			(mockExecuteFunctions.getInputConnectionData as vi.Mock).mockResolvedValue(mockModel);

			const result = await getChatModel.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.getInputConnectionData).toHaveBeenCalledWith(
				NodeConnectionTypes.AiLanguageModel,
				0,
			);
			expect(result).toBe(mockModel);
		});

		it('should return first model when getInputConnectionData returns an array', async () => {
			const models = [mockModel, {} as BaseChatModel];
			(mockExecuteFunctions.getInputConnectionData as vi.Mock).mockResolvedValue(models);

			const result = await getChatModel.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.getInputConnectionData).toHaveBeenCalledWith(
				NodeConnectionTypes.AiLanguageModel,
				0,
			);
			expect(result).toBe(mockModel);
		});

		it('should handle empty array from getInputConnectionData', async () => {
			(mockExecuteFunctions.getInputConnectionData as vi.Mock).mockResolvedValue([]);

			const result = await getChatModel.call(mockExecuteFunctions);

			expect(result).toBeUndefined();
		});
	});

	describe('runLLMValidation', () => {
		it('should return failed GuardrailResult when agent execution fails', async () => {
			const mockAgentExecutor = {
				invoke: vi.fn().mockRejectedValue(new Error('Agent execution failed')),
			};

			vi.mocked((await import('@langchain/classic/agents')).AgentExecutor).mockImplementation(
				() => mockAgentExecutor as unknown as AgentExecutor,
			);

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
				invoke: vi.fn().mockResolvedValue({}), // No tool call
			};

			vi.mocked((await import('@langchain/classic/agents')).AgentExecutor).mockImplementation(
				() => mockAgentExecutor as unknown as AgentExecutor,
			);

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
			const invokeMock = vi.fn().mockResolvedValue({
				content: [{ type: 'text', text: '{"confidenceScore":0.6,"flagged":true}' }],
			});
			vi.mocked(ChatPromptTemplate.fromMessages).mockImplementationOnce(
				() =>
					({
						pipe: vi.fn().mockReturnValue({ invoke: invokeMock }),
					}) as unknown as any,
			);

			vi.mocked(StructuredOutputParser).mockImplementationOnce(
				() =>
					({
						getFormatInstructions: vi.fn().mockReturnValue('Format instructions'),
						parse: vi.fn().mockResolvedValue({ confidenceScore: 0.6, flagged: true }),
					}) as unknown as any,
			);

			const model = { invoke: vi.fn() } as unknown as BaseChatModel;
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
