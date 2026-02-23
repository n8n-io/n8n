import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { mock } from 'jest-mock-extended';
import { NodeOperationError } from 'n8n-workflow';
import type { IExecuteFunctions, INode, INodeExecutionData } from 'n8n-workflow';

import * as commonHelpers from '../../../common';
import { buildToolsAgentExecutionContext } from '../buildExecutionContext';

jest.mock('../../../common', () => ({
	getChatModel: jest.fn(),
	getOptionalMemory: jest.fn(),
}));

const mockContext = mock<IExecuteFunctions>();
const mockNode = mock<INode>();

beforeEach(() => {
	jest.clearAllMocks();
	mockContext.getNode.mockReturnValue(mockNode);
});

describe('buildExecutionContext', () => {
	it('should build execution context with default values', async () => {
		const mockInputData: INodeExecutionData[] = [
			{ json: { text: 'input 1' } },
			{ json: { text: 'input 2' } },
		];
		const mockModel = mock<BaseChatModel>();

		mockContext.getInputData.mockReturnValue(mockInputData);
		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'options.batching.batchSize') return defaultValue;
			if (param === 'options.batching.delayBetweenBatches') return defaultValue;
			if (param === 'needsFallback') return defaultValue;
			return defaultValue;
		});

		jest.spyOn(commonHelpers, 'getChatModel').mockResolvedValue(mockModel);
		jest.spyOn(commonHelpers, 'getOptionalMemory').mockResolvedValue(undefined);

		const result = await buildToolsAgentExecutionContext(mockContext);

		expect(result).toEqual({
			items: mockInputData,
			batchSize: 1,
			delayBetweenBatches: 0,
			needsFallback: false,
			model: mockModel,
			fallbackModel: null,
			memory: undefined,
		});
	});

	it('should build execution context with custom batch settings', async () => {
		const mockInputData: INodeExecutionData[] = [
			{ json: { text: 'input 1' } },
			{ json: { text: 'input 2' } },
		];
		const mockModel = mock<BaseChatModel>();

		mockContext.getInputData.mockReturnValue(mockInputData);
		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'options.batching.batchSize') return 5;
			if (param === 'options.batching.delayBetweenBatches') return 1000;
			if (param === 'needsFallback') return false;
			return defaultValue;
		});

		jest.spyOn(commonHelpers, 'getChatModel').mockResolvedValue(mockModel);
		jest.spyOn(commonHelpers, 'getOptionalMemory').mockResolvedValue(undefined);

		const result = await buildToolsAgentExecutionContext(mockContext);

		expect(result.batchSize).toBe(5);
		expect(result.delayBetweenBatches).toBe(1000);
	});

	it('should build execution context with fallback model when needsFallback is true', async () => {
		const mockInputData: INodeExecutionData[] = [{ json: { text: 'input 1' } }];
		const mockModel = mock<BaseChatModel>();
		const mockFallbackModel = mock<BaseChatModel>();

		mockContext.getInputData.mockReturnValue(mockInputData);
		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'options.batching.batchSize') return defaultValue;
			if (param === 'options.batching.delayBetweenBatches') return defaultValue;
			if (param === 'needsFallback') return true;
			return defaultValue;
		});

		jest
			.spyOn(commonHelpers, 'getChatModel')
			.mockResolvedValueOnce(mockModel)
			.mockResolvedValueOnce(mockFallbackModel);
		jest.spyOn(commonHelpers, 'getOptionalMemory').mockResolvedValue(undefined);

		const result = await buildToolsAgentExecutionContext(mockContext);

		expect(result.needsFallback).toBe(true);
		expect(result.model).toBe(mockModel);
		expect(result.fallbackModel).toBe(mockFallbackModel);
		expect(commonHelpers.getChatModel).toHaveBeenCalledWith(mockContext, 0);
		expect(commonHelpers.getChatModel).toHaveBeenCalledWith(mockContext, 1);
	});

	it('should throw error when fallback is needed but no fallback model is provided', async () => {
		const mockInputData: INodeExecutionData[] = [{ json: { text: 'input 1' } }];
		const mockModel = mock<BaseChatModel>();

		mockContext.getInputData.mockReturnValue(mockInputData);
		mockContext.getNodeParameter.mockImplementation((param, _i, defaultValue) => {
			if (param === 'needsFallback') return true;
			return defaultValue;
		});

		jest
			.spyOn(commonHelpers, 'getChatModel')
			.mockResolvedValueOnce(mockModel)
			.mockResolvedValueOnce(undefined);
		jest.spyOn(commonHelpers, 'getOptionalMemory').mockResolvedValue(undefined);

		await expect(buildToolsAgentExecutionContext(mockContext)).rejects.toThrow(NodeOperationError);
	});

	it('should throw assertion error when no model is provided', async () => {
		const mockInputData: INodeExecutionData[] = [{ json: { text: 'input 1' } }];

		mockContext.getInputData.mockReturnValue(mockInputData);
		mockContext.getNodeParameter.mockImplementation((_param, _i, defaultValue) => {
			return defaultValue;
		});

		jest.spyOn(commonHelpers, 'getChatModel').mockResolvedValue(undefined);
		jest.spyOn(commonHelpers, 'getOptionalMemory').mockResolvedValue(undefined);

		await expect(buildToolsAgentExecutionContext(mockContext)).rejects.toThrow(
			'Please connect a model to the Chat Model input',
		);
	});

	it('should include memory when available', async () => {
		const mockInputData: INodeExecutionData[] = [{ json: { text: 'input 1' } }];
		const mockModel = mock<BaseChatModel>();
		const mockMemory = mock<any>();

		mockContext.getInputData.mockReturnValue(mockInputData);
		mockContext.getNodeParameter.mockImplementation((_param, _i, defaultValue) => {
			return defaultValue;
		});

		jest.spyOn(commonHelpers, 'getChatModel').mockResolvedValue(mockModel);
		jest.spyOn(commonHelpers, 'getOptionalMemory').mockResolvedValue(mockMemory);

		const result = await buildToolsAgentExecutionContext(mockContext);

		expect(result.memory).toBe(mockMemory);
	});
});
