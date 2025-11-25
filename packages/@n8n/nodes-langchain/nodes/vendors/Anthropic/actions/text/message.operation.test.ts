import type { IExecuteFunctions } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';
import * as messageOperation from './message.operation';

// Mock the apiRequest function
jest.mock('../../transport', () => ({
	apiRequest: jest.fn(),
}));

// Mock the getTools helper
jest.mock('../../helpers/utils', () => ({
	getTools: jest.fn().mockResolvedValue({ tools: [], connectedTools: [] }),
}));

import { apiRequest } from '../../transport';

describe('Message Operation - Prompt Caching', () => {
	const executeFunctionsMock = mockDeep<IExecuteFunctions>();
	const apiRequestMock = apiRequest as jest.MockedFunction<typeof apiRequest>;

	beforeEach(() => {
		jest.clearAllMocks();

		// Setup default mock responses
		executeFunctionsMock.getNodeParameter.mockImplementation((paramName: string) => {
			if (paramName === 'modelId') return 'claude-sonnet-4-20250514';
			if (paramName === 'messages.values') return [{ role: 'user', content: 'Hello' }];
			if (paramName === 'addAttachments') return false;
			if (paramName === 'simplify') return true;
			if (paramName === 'options') return {};
			if (paramName === 'options.maxToolsIterations') return 15;
			return undefined;
		});

		// Mock getNodeInputs to return empty array (no AI tools connected)
		executeFunctionsMock.getNodeInputs.mockReturnValue([]);

		apiRequestMock.mockResolvedValue({
			id: 'msg_123',
			type: 'message',
			role: 'assistant',
			content: [{ type: 'text', text: 'Hello!' }],
			model: 'claude-sonnet-4-20250514',
			stop_reason: 'end_turn',
			usage: {
				input_tokens: 10,
				output_tokens: 5,
			},
		});

		executeFunctionsMock.getExecutionCancelSignal.mockReturnValue(undefined);
	});

	describe('System message transformation', () => {
		it('should keep system message as string when prompt caching is disabled', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'modelId') return 'claude-sonnet-4-20250514';
				if (paramName === 'messages.values') return [{ role: 'user', content: 'Test' }];
				if (paramName === 'addAttachments') return false;
				if (paramName === 'simplify') return true;
				if (paramName === 'options')
					return {
						system: 'You are a helpful assistant',
						enablePromptCaching: false,
					};
				if (paramName === 'options.maxToolsIterations') return 15;
				return undefined;
			});

			await messageOperation.execute.call(executeFunctionsMock, 0);

			expect(apiRequestMock).toHaveBeenCalledWith(
				'POST',
				'/v1/messages',
				expect.objectContaining({
					body: expect.objectContaining({
						system: 'You are a helpful assistant',
					}),
					enableAnthropicBetas: expect.objectContaining({
						promptCaching: false,
					}),
				}),
			);
		});

		it('should transform system message to array format when prompt caching is enabled', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'modelId') return 'claude-sonnet-4-20250514';
				if (paramName === 'messages.values') return [{ role: 'user', content: 'Test' }];
				if (paramName === 'addAttachments') return false;
				if (paramName === 'simplify') return true;
				if (paramName === 'options')
					return {
						system: 'You are a helpful assistant with extensive knowledge',
						enablePromptCaching: true,
					};
				if (paramName === 'options.maxToolsIterations') return 15;
				return undefined;
			});

			await messageOperation.execute.call(executeFunctionsMock, 0);

			expect(apiRequestMock).toHaveBeenCalledWith(
				'POST',
				'/v1/messages',
				expect.objectContaining({
					body: expect.objectContaining({
						system: [
							{
								type: 'text',
								text: 'You are a helpful assistant with extensive knowledge',
								cache_control: { type: 'ephemeral' },
							},
						],
					}),
					enableAnthropicBetas: expect.objectContaining({
						promptCaching: true,
					}),
				}),
			);
		});

		it('should not transform system message when caching is enabled but no system message provided', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'modelId') return 'claude-sonnet-4-20250514';
				if (paramName === 'messages.values') return [{ role: 'user', content: 'Test' }];
				if (paramName === 'addAttachments') return false;
				if (paramName === 'simplify') return true;
				if (paramName === 'options')
					return {
						enablePromptCaching: true,
					};
				if (paramName === 'options.maxToolsIterations') return 15;
				return undefined;
			});

			await messageOperation.execute.call(executeFunctionsMock, 0);

			expect(apiRequestMock).toHaveBeenCalledWith(
				'POST',
				'/v1/messages',
				expect.objectContaining({
					body: expect.objectContaining({
						system: undefined,
					}),
				}),
			);
		});

		it('should preserve other options when prompt caching is enabled', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'modelId') return 'claude-sonnet-4-20250514';
				if (paramName === 'messages.values') return [{ role: 'user', content: 'Test' }];
				if (paramName === 'addAttachments') return false;
				if (paramName === 'simplify') return true;
				if (paramName === 'options')
					return {
						system: 'You are a helpful assistant',
						enablePromptCaching: true,
						temperature: 0.7,
						maxTokens: 2048,
						topP: 0.9,
					};
				if (paramName === 'options.maxToolsIterations') return 15;
				return undefined;
			});

			await messageOperation.execute.call(executeFunctionsMock, 0);

			expect(apiRequestMock).toHaveBeenCalledWith(
				'POST',
				'/v1/messages',
				expect.objectContaining({
					body: expect.objectContaining({
						temperature: 0.7,
						max_tokens: 2048,
						top_p: 0.9,
					}),
				}),
			);
		});

		it('should handle code execution and prompt caching together', async () => {
			executeFunctionsMock.getNodeParameter.mockImplementation((paramName: string) => {
				if (paramName === 'modelId') return 'claude-sonnet-4-20250514';
				if (paramName === 'messages.values') return [{ role: 'user', content: 'Test' }];
				if (paramName === 'addAttachments') return false;
				if (paramName === 'simplify') return true;
				if (paramName === 'options')
					return {
						system: 'You are a code assistant',
						enablePromptCaching: true,
						codeExecution: true,
					};
				if (paramName === 'options.maxToolsIterations') return 15;
				return undefined;
			});

			await messageOperation.execute.call(executeFunctionsMock, 0);

			expect(apiRequestMock).toHaveBeenCalledWith(
				'POST',
				'/v1/messages',
				expect.objectContaining({
					enableAnthropicBetas: {
						codeExecution: true,
						promptCaching: true,
					},
				}),
			);
		});
	});
});
