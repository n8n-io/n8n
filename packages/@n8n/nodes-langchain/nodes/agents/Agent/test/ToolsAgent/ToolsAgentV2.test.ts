import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { mock } from 'jest-mock-extended';
import { AgentExecutor } from 'langchain/agents';
import type { Tool } from 'langchain/tools';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import * as helpers from '../../../../../utils/helpers';
import { toolsAgentExecute } from '../../agents/ToolsAgent/V2/execute';

const mockHelpers = mock<IExecuteFunctions['helpers']>();
const mockContext = mock<IExecuteFunctions>({ helpers: mockHelpers });

beforeEach(() => jest.resetAllMocks());

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
				.mockResolvedValueOnce({ output: JSON.stringify({ text: 'success 2' }) }),
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
				.mockResolvedValueOnce({ output: '{ "text": "success" }' })
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
});
