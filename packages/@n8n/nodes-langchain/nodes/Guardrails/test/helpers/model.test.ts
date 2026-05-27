import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { GuardrailError } from '../../actions/types';
import { getChatModel, runLLMValidation } from '../../helpers/model';

const {
	MockChatPromptTemplate,
	MockAgentExecutor,
	MockStructuredOutputParser,
	MockOutputParserException,
} = vi.hoisted(() => {
	class MockChatPromptTemplate {
		formatMessages = vi.fn(() => ({
			format: vi.fn(),
			pipe: vi.fn().mockReturnValue({
				pipe: vi.fn().mockReturnValue({
					invoke: vi.fn(),
				}),
			}),
		}));
		static fromMessages = vi.fn(() => ({
			pipe: vi.fn(),
		}));
	}

	class MockAgentExecutor {
		static invoke = vi.fn();
	}

	class MockStructuredOutputParser {
		invoke = vi.fn();
		getFormatInstructions = vi.fn().mockReturnValue('Format instructions');
		static parse = vi.fn();
	}

	class MockOutputParserException {
		message: string;
		name: string;

		constructor(message: string) {
			this.message = message;
			this.name = 'OutputParserException';
		}
	}

	return {
		MockChatPromptTemplate,
		MockAgentExecutor,
		MockStructuredOutputParser,
		MockOutputParserException,
	};
});

vi.mock('@langchain/core/prompts', () => ({
	ChatPromptTemplate: MockChatPromptTemplate,
}));

vi.mock('@langchain/core/output_parsers', () => ({
	StructuredOutputParser: MockStructuredOutputParser,
	OutputParserException: MockOutputParserException,
}));

vi.mock('@langchain/classic/agents', () => ({
	AgentExecutor: MockAgentExecutor,
	createToolCallingAgent: vi.fn(() => ({
		streamRunnable: false,
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
			(mockExecuteFunctions.getInputConnectionData as Mock).mockResolvedValue(mockModel);

			const result = await getChatModel.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.getInputConnectionData).toHaveBeenCalledWith(
				NodeConnectionTypes.AiLanguageModel,
				0,
			);
			expect(result).toBe(mockModel);
		});

		it('should return first model when getInputConnectionData returns an array', async () => {
			const models = [mockModel, {} as BaseChatModel];
			(mockExecuteFunctions.getInputConnectionData as Mock).mockResolvedValue(models);

			const result = await getChatModel.call(mockExecuteFunctions);

			expect(mockExecuteFunctions.getInputConnectionData).toHaveBeenCalledWith(
				NodeConnectionTypes.AiLanguageModel,
				0,
			);
			expect(result).toBe(mockModel);
		});

		it('should handle empty array from getInputConnectionData', async () => {
			(mockExecuteFunctions.getInputConnectionData as Mock).mockResolvedValue([]);

			const result = await getChatModel.call(mockExecuteFunctions);

			expect(result).toBeUndefined();
		});
	});

	describe('runLLMValidation', () => {
		it('should return failed GuardrailResult when agent execution fails', async () => {
			vi.mocked(MockAgentExecutor.invoke).mockImplementation(
				() => new Error('Agent execution failed'),
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
			vi.mocked(MockAgentExecutor.invoke).mockImplementation(() => {});

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
			vi.mocked(MockChatPromptTemplate.fromMessages).mockImplementationOnce(
				() =>
					({
						pipe: vi.fn().mockReturnValue({ invoke: invokeMock }),
					}) as unknown as any,
			);

			vi.mocked(MockStructuredOutputParser.parse).mockImplementationOnce(() => ({
				confidenceScore: 0.6,
				flagged: true,
			}));

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
