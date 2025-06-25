import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { mock } from 'jest-mock-extended';
import { AgentExecutor } from 'langchain/agents';
import type { Tool } from 'langchain/tools';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import * as helpers from '../../../../../utils/helpers';
import * as outputParserModule from '../../../../../utils/output_parsers/N8nOutputParser';
import { toolsAgentExecute } from '../../agents/ToolsAgent/V2/execute';

jest.mock('../../../../../utils/output_parsers/N8nOutputParser', () => ({
	getOptionalOutputParser: jest.fn(),
	N8nStructuredOutputParser: jest.fn(),
}));

const mockHelpers = mock<IExecuteFunctions['helpers']>();
const mockContext = mock<IExecuteFunctions>({ helpers: mockHelpers });

beforeEach(() => {
	jest.clearAllMocks();
	jest.resetAllMocks();
});

describe('toolsAgentExecute', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockContext.logger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};
	});

	it('should process items sequentially when batchSize is not set', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 2;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([
			{ json: { text: 'test input 1' } },
			{ json: { text: 'test input 2' } },
		]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = jest.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(mockModel);

		const mockTools = [mock<Tool>()];
		jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue(mockTools);

		// Mock getNodeParameter to return default values
		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'text') return 'test input';
			if (param === 'needsFallback') return false;
			if (param === 'options.batching.batchSize') return defaultValue;
			if (param === 'options.batching.delayBetweenBatches') return defaultValue;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		const mockExecutor = {
			invoke: jest
				.fn()
				.mockResolvedValueOnce({ output: { text: 'success 1' } })
				.mockResolvedValueOnce({ output: { text: 'success 2' } }),
		};

		jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

		const result = await toolsAgentExecute.call(mockContext);

		expect(mockExecutor.invoke).toHaveBeenCalledTimes(2);
		expect(result[0]).toHaveLength(2);
		expect(result[0][0].json).toEqual({ output: { text: 'success 1' } });
		expect(result[0][1].json).toEqual({ output: { text: 'success 2' } });
	});

	it('should process items in parallel within batches when batchSize > 1', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 2;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([
			{ json: { text: 'test input 1' } },
			{ json: { text: 'test input 2' } },
			{ json: { text: 'test input 3' } },
			{ json: { text: 'test input 4' } },
		]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = jest.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(mockModel);

		const mockTools = [mock<Tool>()];
		jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue(mockTools);

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'options.batching.batchSize') return 2;
			if (param === 'options.batching.delayBetweenBatches') return 100;
			if (param === 'text') return 'test input';
			if (param === 'needsFallback') return false;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		const mockExecutor = {
			invoke: jest
				.fn()
				.mockResolvedValueOnce({ output: { text: 'success 1' } })
				.mockResolvedValueOnce({ output: { text: 'success 2' } })
				.mockResolvedValueOnce({ output: { text: 'success 3' } })
				.mockResolvedValueOnce({ output: { text: 'success 4' } }),
		};

		jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

		const result = await toolsAgentExecute.call(mockContext);

		expect(mockExecutor.invoke).toHaveBeenCalledTimes(4); // Each item is processed individually
		expect(result[0]).toHaveLength(4);

		expect(result[0][0].json).toEqual({ output: { text: 'success 1' } });
		expect(result[0][1].json).toEqual({ output: { text: 'success 2' } });
		expect(result[0][2].json).toEqual({ output: { text: 'success 3' } });
		expect(result[0][3].json).toEqual({ output: { text: 'success 4' } });
	});

	it('should handle errors in batch processing when continueOnFail is true', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 2;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([
			{ json: { text: 'test input 1' } },
			{ json: { text: 'test input 2' } },
		]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = jest.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(mockModel);

		const mockTools = [mock<Tool>()];
		jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue(mockTools);

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'options.batching.batchSize') return 2;
			if (param === 'options.batching.delayBetweenBatches') return 0;
			if (param === 'text') return 'test input';
			if (param === 'needsFallback') return false;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		mockContext.continueOnFail.mockReturnValue(true);

		const mockExecutor = {
			invoke: jest
				.fn()
				.mockResolvedValueOnce({ output: { text: 'success' } })
				.mockRejectedValueOnce(new Error('Test error')),
		};

		jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

		const result = await toolsAgentExecute.call(mockContext);

		expect(result[0]).toHaveLength(2);
		expect(result[0][0].json).toEqual({ output: { text: 'success' } });
		expect(result[0][1].json).toEqual({ error: 'Test error' });
	});

	it('should throw error in batch processing when continueOnFail is false', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 2;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([
			{ json: { text: 'test input 1' } },
			{ json: { text: 'test input 2' } },
		]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = jest.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(mockModel);

		const mockTools = [mock<Tool>()];
		jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue(mockTools);

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'options.batching.batchSize') return 2;
			if (param === 'options.batching.delayBetweenBatches') return 0;
			if (param === 'text') return 'test input';
			if (param === 'needsFallback') return false;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		mockContext.continueOnFail.mockReturnValue(false);

		const mockExecutor = {
			invoke: jest
				.fn()
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success' }) })
				.mockRejectedValueOnce(new Error('Test error')),
		};

		jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

		await expect(toolsAgentExecute.call(mockContext)).rejects.toThrow('Test error');
	});

	it('should fetch output parser with correct item index', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 2;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([
			{ json: { text: 'test input 1' } },
			{ json: { text: 'test input 2' } },
			{ json: { text: 'test input 3' } },
		]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = jest.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(mockModel);

		const mockTools = [mock<Tool>()];
		jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue(mockTools);

		const mockParser1 = mock<outputParserModule.N8nStructuredOutputParser>();
		const mockParser2 = mock<outputParserModule.N8nStructuredOutputParser>();
		const mockParser3 = mock<outputParserModule.N8nStructuredOutputParser>();

		const getOptionalOutputParserSpy = jest
			.spyOn(outputParserModule, 'getOptionalOutputParser')
			.mockResolvedValueOnce(mockParser1)
			.mockResolvedValueOnce(mockParser2)
			.mockResolvedValueOnce(mockParser3)
			.mockResolvedValueOnce(undefined); // For the check call

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'text') return 'test input';
			if (param === 'options.batching.batchSize') return defaultValue;
			if (param === 'options.batching.delayBetweenBatches') return defaultValue;
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		const mockExecutor = {
			invoke: jest
				.fn()
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success 1' }) })
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success 2' }) })
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success 3' }) }),
		};

		jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

		await toolsAgentExecute.call(mockContext);

		// Verify getOptionalOutputParser was called with correct indices
		expect(getOptionalOutputParserSpy).toHaveBeenCalledTimes(6);
		expect(getOptionalOutputParserSpy).toHaveBeenNthCalledWith(1, mockContext, 0);
		expect(getOptionalOutputParserSpy).toHaveBeenNthCalledWith(2, mockContext, 0);
		expect(getOptionalOutputParserSpy).toHaveBeenNthCalledWith(3, mockContext, 1);
		expect(getOptionalOutputParserSpy).toHaveBeenNthCalledWith(4, mockContext, 0);
		expect(getOptionalOutputParserSpy).toHaveBeenNthCalledWith(5, mockContext, 2);
	});

	it('should pass different output parsers to getTools for each item', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 2;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([
			{ json: { text: 'test input 1' } },
			{ json: { text: 'test input 2' } },
		]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = jest.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(mockModel);

		const mockParser1 = mock<outputParserModule.N8nStructuredOutputParser>();
		const mockParser2 = mock<outputParserModule.N8nStructuredOutputParser>();

		jest
			.spyOn(outputParserModule, 'getOptionalOutputParser')
			.mockResolvedValueOnce(mockParser1)
			.mockResolvedValueOnce(mockParser2);

		const getToolsSpy = jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue([mock<Tool>()]);

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'text') return 'test input';
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		const mockExecutor = {
			invoke: jest
				.fn()
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success 1' }) })
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success 2' }) }),
		};

		jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

		await toolsAgentExecute.call(mockContext);

		// Verify getTools was called with different parsers
		expect(getToolsSpy).toHaveBeenCalledTimes(2);
		expect(getToolsSpy).toHaveBeenNthCalledWith(1, mockContext, true, false);
		expect(getToolsSpy).toHaveBeenNthCalledWith(2, mockContext, true, false);
	});

	it('should maintain correct parser-item mapping in batch processing', async () => {
		const mockNode = mock<INode>();
		mockNode.typeVersion = 2;
		mockContext.getNode.mockReturnValue(mockNode);
		mockContext.getInputData.mockReturnValue([
			{ json: { text: 'test input 1' } },
			{ json: { text: 'test input 2' } },
			{ json: { text: 'test input 3' } },
			{ json: { text: 'test input 4' } },
		]);

		const mockModel = mock<BaseChatModel>();
		mockModel.bindTools = jest.fn();
		mockModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(mockModel);

		const mockParsers = [
			mock<outputParserModule.N8nStructuredOutputParser>(),
			mock<outputParserModule.N8nStructuredOutputParser>(),
			mock<outputParserModule.N8nStructuredOutputParser>(),
			mock<outputParserModule.N8nStructuredOutputParser>(),
		];

		const getOptionalOutputParserSpy = jest
			.spyOn(outputParserModule, 'getOptionalOutputParser')
			.mockImplementation(async (_ctx, index) => mockParsers[index || 0]);

		jest.spyOn(helpers, 'getConnectedTools').mockResolvedValue([mock<Tool>()]);

		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'options.batching.batchSize') return 2;
			if (param === 'options.batching.delayBetweenBatches') return 0;
			if (param === 'text') return 'test input';
			if (param === 'options')
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			return defaultValue;
		});

		const mockExecutor = {
			invoke: jest
				.fn()
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success 1' }) })
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success 2' }) })
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success 3' }) })
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success 4' }) }),
		};

		jest.spyOn(AgentExecutor, 'fromAgentAndTools').mockReturnValue(mockExecutor as any);

		await toolsAgentExecute.call(mockContext);

		// Verify each item got its corresponding parser based on index
		// It's called once per item + once to check if output parser is connected
		expect(getOptionalOutputParserSpy).toHaveBeenCalledTimes(6);
		expect(getOptionalOutputParserSpy).toHaveBeenNthCalledWith(1, mockContext, 0);
		expect(getOptionalOutputParserSpy).toHaveBeenNthCalledWith(2, mockContext, 1);
		expect(getOptionalOutputParserSpy).toHaveBeenNthCalledWith(3, mockContext, 0);
		expect(getOptionalOutputParserSpy).toHaveBeenNthCalledWith(4, mockContext, 2);
		expect(getOptionalOutputParserSpy).toHaveBeenNthCalledWith(5, mockContext, 3);
		expect(getOptionalOutputParserSpy).toHaveBeenNthCalledWith(6, mockContext, 0);
	});
});
