import { mock } from 'jest-mock-extended';
import type { IWebhookFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { invokeAgent } from '../langchain-utils';

import {
	getChatModel,
	getOptionalMemory,
	getTools,
	preparePrompt,
} from '../../../agents/Agent/agents/ToolsAgent/common';
import { createAgentExecutor } from '../../../agents/Agent/agents/ToolsAgent/V2/execute';
import { getOptionalOutputParser } from '../../../../utils/output_parsers/N8nOutputParser';

jest.mock('../../../agents/Agent/agents/ToolsAgent/common', () => ({
	getChatModel: jest.fn(),
	getOptionalMemory: jest.fn(),
	getTools: jest.fn(),
	preparePrompt: jest.fn(),
}));

jest.mock('../../../agents/Agent/agents/ToolsAgent/V2/execute', () => ({
	createAgentExecutor: jest.fn(),
}));

jest.mock('../../../../utils/output_parsers/N8nOutputParser', () => ({
	getOptionalOutputParser: jest.fn(),
}));

describe('langchain-utils', () => {
	describe('invokeAgent', () => {
		let nodeContext: IWebhookFunctions;

		beforeEach(() => {
			jest.clearAllMocks();

			nodeContext = mock<IWebhookFunctions>({
				getNodeParameter: jest.fn(),
				getNode: jest.fn().mockReturnValue({ name: 'Test Node' }),
			});
		});

		test('should throw error if no model is connected', async () => {
			(getChatModel as jest.Mock).mockResolvedValue(null);
			(getOptionalMemory as jest.Mock).mockResolvedValue(null);
			(nodeContext.getNodeParameter as jest.Mock).mockReturnValue(false);

			await expect(invokeAgent(nodeContext, 'test input')).rejects.toThrow(
				'Please connect a model to the Chat Model input',
			);
		});

		test('should throw NodeOperationError if fallback is needed but fallback model is not connected', async () => {
			const mockModel = { name: 'primary-model' };
			(getChatModel as jest.Mock).mockResolvedValueOnce(mockModel).mockResolvedValueOnce(null);

			(getOptionalMemory as jest.Mock).mockResolvedValue(null);
			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'needsFallback') return true;
				if (param === 'options') return {};
				return false;
			});

			await expect(invokeAgent(nodeContext, 'test input')).rejects.toThrow(
				'Please connect a model to the Fallback Model input or disable the fallback option',
			);
		});

		test('should invoke agent with microsoftMcpTools when provided', async () => {
			const mockModel = { name: 'primary-model' };
			const mockMemory = { name: 'memory' };
			const mockTools = [{ name: 'tool1' }];
			const microsoftMcpTools = [{ name: 'mcp-tool1' }, { name: 'mcp-tool2' }];
			const mockPrompt = { name: 'prompt' };
			const mockExecutor = {
				invoke: jest.fn().mockResolvedValue({ output: 'test response' }),
			};

			(getChatModel as jest.Mock).mockResolvedValue(mockModel);
			(getOptionalMemory as jest.Mock).mockResolvedValue(mockMemory);
			(getTools as jest.Mock).mockResolvedValue(mockTools);
			(getOptionalOutputParser as jest.Mock).mockResolvedValue(null);
			(preparePrompt as jest.Mock).mockReturnValue(mockPrompt);
			(createAgentExecutor as jest.Mock).mockReturnValue(mockExecutor);

			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'needsFallback') return false;
				if (param === 'options') return {};
				return false;
			});

			const result = await invokeAgent(
				nodeContext,
				'test input',
				undefined,
				{},
				microsoftMcpTools as any,
			);

			expect(result).toBe('test response');

			expect(getTools).toHaveBeenCalled();
			expect(createAgentExecutor).toHaveBeenCalledWith(
				mockModel,
				[...mockTools, ...microsoftMcpTools],
				mockPrompt,
				{ maxIterations: 10 },
				null,
				mockMemory,
				null,
			);
		});

		test('should invoke agent without microsoftMcpTools when not provided', async () => {
			const mockModel = { name: 'primary-model' };
			const mockMemory = { name: 'memory' };
			const mockTools = [{ name: 'tool1' }];
			const mockPrompt = { name: 'prompt' };
			const mockExecutor = {
				invoke: jest.fn().mockResolvedValue({ output: 'test response' }),
			};

			(getChatModel as jest.Mock).mockResolvedValue(mockModel);
			(getOptionalMemory as jest.Mock).mockResolvedValue(mockMemory);
			(getTools as jest.Mock).mockResolvedValue(mockTools);
			(getOptionalOutputParser as jest.Mock).mockResolvedValue(null);
			(preparePrompt as jest.Mock).mockReturnValue(mockPrompt);
			(createAgentExecutor as jest.Mock).mockReturnValue(mockExecutor);

			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'needsFallback') return false;
				if (param === 'options') return {};
				return false;
			});

			const result = await invokeAgent(nodeContext, 'test input');

			expect(result).toBe('test response');
			expect(createAgentExecutor).toHaveBeenCalledWith(
				mockModel,
				mockTools,
				mockPrompt,
				{ maxIterations: 10 },
				null,
				mockMemory,
				null,
			);
		});

		test('should handle custom systemMessage parameter', async () => {
			const mockModel = { name: 'primary-model' };
			const mockMemory = { name: 'memory' };
			const mockTools = [{ name: 'tool1' }];
			const mockPrompt = { name: 'prompt' };
			const mockExecutor = {
				invoke: jest.fn().mockResolvedValue({ output: 'test response' }),
			};

			(getChatModel as jest.Mock).mockResolvedValue(mockModel);
			(getOptionalMemory as jest.Mock).mockResolvedValue(mockMemory);
			(getTools as jest.Mock).mockResolvedValue(mockTools);
			(getOptionalOutputParser as jest.Mock).mockResolvedValue(null);
			(preparePrompt as jest.Mock).mockReturnValue(mockPrompt);
			(createAgentExecutor as jest.Mock).mockReturnValue(mockExecutor);

			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'needsFallback') return false;
				if (param === 'options') return {};
				return false;
			});

			const customSystemMessage = 'Custom system message';
			const result = await invokeAgent(nodeContext, 'test input', customSystemMessage);

			expect(result).toBe('test response');
			expect(mockExecutor.invoke).toHaveBeenCalledWith(
				expect.objectContaining({
					input: 'test input',
					system_message: customSystemMessage,
				}),
				{},
			);
		});

		test('should handle fallback model when needsFallback is true', async () => {
			const mockModel = { name: 'primary-model' };
			const mockFallbackModel = { name: 'fallback-model' };
			const mockMemory = { name: 'memory' };
			const mockTools = [{ name: 'tool1' }];
			const mockPrompt = { name: 'prompt' };
			const mockExecutor = {
				invoke: jest.fn().mockResolvedValue({ output: 'test response' }),
			};

			(getChatModel as jest.Mock)
				.mockResolvedValueOnce(mockModel)
				.mockResolvedValueOnce(mockFallbackModel);
			(getOptionalMemory as jest.Mock).mockResolvedValue(mockMemory);
			(getTools as jest.Mock).mockResolvedValue(mockTools);
			(getOptionalOutputParser as jest.Mock).mockResolvedValue(null);
			(preparePrompt as jest.Mock).mockReturnValue(mockPrompt);
			(createAgentExecutor as jest.Mock).mockReturnValue(mockExecutor);

			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'needsFallback') return true;
				if (param === 'options') return {};
				return false;
			});

			const result = await invokeAgent(nodeContext, 'test input');

			expect(result).toBe('test response');
			expect(createAgentExecutor).toHaveBeenCalledWith(
				mockModel,
				mockTools,
				mockPrompt,
				{ maxIterations: 10 },
				null,
				mockMemory,
				mockFallbackModel,
			);
		});

		test('should handle custom maxIterations option', async () => {
			const mockModel = { name: 'primary-model' };
			const mockMemory = { name: 'memory' };
			const mockTools = [{ name: 'tool1' }];
			const mockPrompt = { name: 'prompt' };
			const mockExecutor = {
				invoke: jest.fn().mockResolvedValue({ output: 'test response' }),
			};

			(getChatModel as jest.Mock).mockResolvedValue(mockModel);
			(getOptionalMemory as jest.Mock).mockResolvedValue(mockMemory);
			(getTools as jest.Mock).mockResolvedValue(mockTools);
			(getOptionalOutputParser as jest.Mock).mockResolvedValue(null);
			(preparePrompt as jest.Mock).mockReturnValue(mockPrompt);
			(createAgentExecutor as jest.Mock).mockReturnValue(mockExecutor);

			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'needsFallback') return false;
				if (param === 'options') return { maxIterations: 20 };
				return false;
			});

			const result = await invokeAgent(nodeContext, 'test input');

			expect(result).toBe('test response');
			expect(createAgentExecutor).toHaveBeenCalledWith(
				mockModel,
				mockTools,
				mockPrompt,
				{ maxIterations: 20 },
				null,
				mockMemory,
				null,
			);
		});

		test('should throw NodeOperationError when executor returns rejected status', async () => {
			const mockModel = { name: 'primary-model' };
			const mockMemory = { name: 'memory' };
			const mockTools = [{ name: 'tool1' }];
			const mockPrompt = { name: 'prompt' };
			const mockError = new Error('Execution failed');
			const mockExecutor = {
				invoke: jest.fn().mockResolvedValue({ status: 'rejected', reason: mockError }),
			};

			(getChatModel as jest.Mock).mockResolvedValue(mockModel);
			(getOptionalMemory as jest.Mock).mockResolvedValue(mockMemory);
			(getTools as jest.Mock).mockResolvedValue(mockTools);
			(getOptionalOutputParser as jest.Mock).mockResolvedValue(null);
			(preparePrompt as jest.Mock).mockReturnValue(mockPrompt);
			(createAgentExecutor as jest.Mock).mockReturnValue(mockExecutor);

			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'needsFallback') return false;
				if (param === 'options') return {};
				return false;
			});

			await expect(invokeAgent(nodeContext, 'test input')).rejects.toThrow(NodeOperationError);
		});

		test('should parse JSON output when memory and outputParser are present', async () => {
			const mockModel = { name: 'primary-model' };
			const mockMemory = { name: 'memory' };
			const mockTools = [{ name: 'tool1' }];
			const mockPrompt = { name: 'prompt' };
			const mockOutputParser = { name: 'outputParser' };
			const mockExecutor = {
				invoke: jest
					.fn()
					.mockResolvedValue({ output: '{"output": {"result": "parsed response"}}' }),
			};

			(getChatModel as jest.Mock).mockResolvedValue(mockModel);
			(getOptionalMemory as jest.Mock).mockResolvedValue(mockMemory);
			(getTools as jest.Mock).mockResolvedValue(mockTools);
			(getOptionalOutputParser as jest.Mock).mockResolvedValue(mockOutputParser);
			(preparePrompt as jest.Mock).mockReturnValue(mockPrompt);
			(createAgentExecutor as jest.Mock).mockReturnValue(mockExecutor);

			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'needsFallback') return false;
				if (param === 'options') return {};
				return false;
			});

			const result = await invokeAgent(nodeContext, 'test input');

			expect(result).toEqual({ result: 'parsed response' });
		});

		test('should return raw output when memory is present but outputParser is not', async () => {
			const mockModel = { name: 'primary-model' };
			const mockMemory = { name: 'memory' };
			const mockTools = [{ name: 'tool1' }];
			const mockPrompt = { name: 'prompt' };
			const mockExecutor = {
				invoke: jest.fn().mockResolvedValue({ output: 'raw output response' }),
			};

			(getChatModel as jest.Mock).mockResolvedValue(mockModel);
			(getOptionalMemory as jest.Mock).mockResolvedValue(mockMemory);
			(getTools as jest.Mock).mockResolvedValue(mockTools);
			(getOptionalOutputParser as jest.Mock).mockResolvedValue(null);
			(preparePrompt as jest.Mock).mockReturnValue(mockPrompt);
			(createAgentExecutor as jest.Mock).mockReturnValue(mockExecutor);

			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'needsFallback') return false;
				if (param === 'options') return {};
				return false;
			});

			const result = await invokeAgent(nodeContext, 'test input');

			expect(result).toBe('raw output response');
		});

		test('should concatenate microsoftMcpTools with regular tools', async () => {
			const mockModel = { name: 'primary-model' };
			const mockMemory = { name: 'memory' };
			const mockTools = [{ name: 'tool1' }, { name: 'tool2' }];
			const microsoftMcpTools = [{ name: 'mcp-tool1' }, { name: 'mcp-tool2' }];
			const mockPrompt = { name: 'prompt' };
			const mockExecutor = {
				invoke: jest.fn().mockResolvedValue({ output: 'test response' }),
			};

			(getChatModel as jest.Mock).mockResolvedValue(mockModel);
			(getOptionalMemory as jest.Mock).mockResolvedValue(mockMemory);
			(getTools as jest.Mock).mockResolvedValue(mockTools);
			(getOptionalOutputParser as jest.Mock).mockResolvedValue(null);
			(preparePrompt as jest.Mock).mockReturnValue(mockPrompt);
			(createAgentExecutor as jest.Mock).mockReturnValue(mockExecutor);

			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'needsFallback') return false;
				if (param === 'options') return {};
				return false;
			});

			await invokeAgent(nodeContext, 'test input', undefined, {}, microsoftMcpTools as any);

			expect(createAgentExecutor).toHaveBeenCalledWith(
				mockModel,
				[...mockTools, ...microsoftMcpTools],
				mockPrompt,
				{ maxIterations: 10 },
				null,
				mockMemory,
				null,
			);
		});

		test('should use empty array for microsoftMcpTools when not provided', async () => {
			const mockModel = { name: 'primary-model' };
			const mockMemory = { name: 'memory' };
			const mockTools = [{ name: 'tool1' }];
			const mockPrompt = { name: 'prompt' };
			const mockExecutor = {
				invoke: jest.fn().mockResolvedValue({ output: 'test response' }),
			};

			(getChatModel as jest.Mock).mockResolvedValue(mockModel);
			(getOptionalMemory as jest.Mock).mockResolvedValue(mockMemory);
			(getTools as jest.Mock).mockResolvedValue(mockTools);
			(getOptionalOutputParser as jest.Mock).mockResolvedValue(null);
			(preparePrompt as jest.Mock).mockReturnValue(mockPrompt);
			(createAgentExecutor as jest.Mock).mockReturnValue(mockExecutor);

			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'needsFallback') return false;
				if (param === 'options') return {};
				return false;
			});

			await invokeAgent(nodeContext, 'test input');

			// Verify that only regular tools were used (no microsoftMcpTools)
			expect(createAgentExecutor).toHaveBeenCalledWith(
				mockModel,
				mockTools,
				mockPrompt,
				{ maxIterations: 10 },
				null,
				mockMemory,
				null,
			);
		});

		test('should pass custom invokeOptions to executor', async () => {
			const mockModel = { name: 'primary-model' };
			const mockMemory = { name: 'memory' };
			const mockTools = [{ name: 'tool1' }];
			const mockPrompt = { name: 'prompt' };
			const mockExecutor = {
				invoke: jest.fn().mockResolvedValue({ output: 'test response' }),
			};

			(getChatModel as jest.Mock).mockResolvedValue(mockModel);
			(getOptionalMemory as jest.Mock).mockResolvedValue(mockMemory);
			(getTools as jest.Mock).mockResolvedValue(mockTools);
			(getOptionalOutputParser as jest.Mock).mockResolvedValue(null);
			(preparePrompt as jest.Mock).mockReturnValue(mockPrompt);
			(createAgentExecutor as jest.Mock).mockReturnValue(mockExecutor);

			(nodeContext.getNodeParameter as jest.Mock).mockImplementation((param: string) => {
				if (param === 'needsFallback') return false;
				if (param === 'options') return {};
				return false;
			});

			const customInvokeOptions = { timeout: 5000, tags: ['test'] };
			await invokeAgent(nodeContext, 'test input', undefined, customInvokeOptions);

			expect(mockExecutor.invoke).toHaveBeenCalledWith(
				expect.objectContaining({
					input: 'test input',
				}),
				customInvokeOptions,
			);
		});
	});
});
