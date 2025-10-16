import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { AgentExecutor } from 'langchain/agents';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { GuardrailError } from '../../actions/types';
import { getChatModel, runLLMValidation } from '../../helpers/model';

jest.mock('@langchain/core/prompts', () => ({
	ChatPromptTemplate: {
		fromMessages: jest.fn(() => ({
			format: jest.fn(),
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

jest.mock('langchain/tools', () => ({
	DynamicStructuredTool: jest.fn().mockImplementation(({ func }) => ({
		name: 'submitGuardrailResult',
		func,
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

			const result = await runLLMValidation(
				'test-guardrail',
				mockModel,
				'Test prompt',
				'Test input',
				0.5,
			);

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

			const result = await runLLMValidation(
				'test-guardrail',
				mockModel,
				'Test prompt',
				'Test input',
				0.5,
			);

			expect(result).toEqual({
				guardrailName: 'test-guardrail',
				tripwireTriggered: true,
				executionFailed: true,
				originalException: expect.any(GuardrailError),
				info: {},
			});
		});
	});
});
