/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { FakeChatModel } from '@langchain/core/utils/testing';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import * as helperModule from '@utils/helpers';
import * as outputParserModule from '@utils/output_parsers/N8nOutputParser';

import { ChainLlm } from '../ChainLlm.node';
import * as executeChainModule from '../methods/chainExecutor';

jest.mock('@utils/helpers', () => ({
	getPromptInputByType: jest.fn(),
}));

jest.mock('@utils/output_parsers/N8nOutputParser', () => ({
	getOptionalOutputParser: jest.fn(),
}));

jest.mock('../methods/chainExecutor', () => ({
	executeChain: jest.fn(),
}));

describe('ChainLlm Node', () => {
	let node: ChainLlm;
	let mockExecuteFunction: jest.Mocked<IExecuteFunctions>;

	beforeEach(() => {
		node = new ChainLlm();
		mockExecuteFunction = mock<IExecuteFunctions>();

		mockExecuteFunction.logger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};

		mockExecuteFunction.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunction.getNode.mockReturnValue({
			name: 'Chain LLM',
			typeVersion: 1.5,
			parameters: {},
		} as INode);

		mockExecuteFunction.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
			if (param === 'messages.messageValues') return [];
			return defaultValue;
		});

		const fakeLLM = new FakeChatModel({});
		mockExecuteFunction.getInputConnectionData.mockResolvedValue(fakeLLM);

		jest.clearAllMocks();
	});

	describe('description', () => {
		it('should have the expected properties', () => {
			expect(node.description).toBeDefined();
			expect(node.description.name).toBe('chainLlm');
			expect(node.description.displayName).toBe('Basic LLM Chain');
			expect(node.description.version).toContain(1.5);
			expect(node.description.properties).toBeDefined();
			expect(node.description.inputs).toBeDefined();
			expect(node.description.outputs).toEqual([NodeConnectionTypes.Main]);
		});
	});

	describe('execute', () => {
		it('should execute the chain with the correct parameters', async () => {
			(helperModule.getPromptInputByType as jest.Mock).mockReturnValue('Test prompt');

			(outputParserModule.getOptionalOutputParser as jest.Mock).mockResolvedValue(undefined);

			(executeChainModule.executeChain as jest.Mock).mockResolvedValue(['Test response']);

			const result = await node.execute.call(mockExecuteFunction);

			expect(executeChainModule.executeChain).toHaveBeenCalledWith({
				context: mockExecuteFunction,
				itemIndex: 0,
				query: 'Test prompt',
				llm: expect.any(FakeChatModel),
				outputParser: undefined,
				messages: [],
			});

			expect(mockExecuteFunction.logger.debug).toHaveBeenCalledWith('Executing Basic LLM Chain');

			expect(result).toEqual([[{ json: expect.any(Object) }]]);
		});

		it('should handle multiple input items', async () => {
			// Set up multiple input items
			mockExecuteFunction.getInputData.mockReturnValue([
				{ json: { item: 1 } },
				{ json: { item: 2 } },
			]);

			(helperModule.getPromptInputByType as jest.Mock)
				.mockReturnValueOnce('Test prompt 1')
				.mockReturnValueOnce('Test prompt 2');

			(outputParserModule.getOptionalOutputParser as jest.Mock).mockResolvedValue(undefined);

			(executeChainModule.executeChain as jest.Mock)
				.mockResolvedValueOnce(['Response 1'])
				.mockResolvedValueOnce(['Response 2']);

			const result = await node.execute.call(mockExecuteFunction);

			expect(executeChainModule.executeChain).toHaveBeenCalledTimes(2);

			expect(result[0]).toHaveLength(2);
		});

		it('should use the prompt parameter directly for older versions', async () => {
			// Set an older version
			mockExecuteFunction.getNode.mockReturnValue({
				name: 'Chain LLM',
				typeVersion: 1.3,
				parameters: {},
			} as INode);

			mockExecuteFunction.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
				if (param === 'prompt') return 'Old version prompt';
				if (param === 'messages.messageValues') return [];
				return defaultValue;
			});

			(executeChainModule.executeChain as jest.Mock).mockResolvedValue(['Test response']);

			(outputParserModule.getOptionalOutputParser as jest.Mock).mockResolvedValue(undefined);

			await node.execute.call(mockExecuteFunction);

			expect(executeChainModule.executeChain).toHaveBeenCalledWith({
				context: mockExecuteFunction,
				itemIndex: 0,
				query: 'Old version prompt',
				llm: expect.any(Object),
				outputParser: undefined,
				messages: expect.any(Array),
			});
		});

		it('should throw an error if prompt is empty', async () => {
			(helperModule.getPromptInputByType as jest.Mock).mockReturnValue(undefined);

			(outputParserModule.getOptionalOutputParser as jest.Mock).mockResolvedValue(undefined);

			mockExecuteFunction.getNode.mockReturnValue({ name: 'Test Node' } as INode);

			await expect(node.execute.call(mockExecuteFunction)).rejects.toThrow(/prompt.*empty/);
		});

		it('should continue on failure when configured', async () => {
			(helperModule.getPromptInputByType as jest.Mock).mockReturnValue('Test prompt');

			const error = new Error('Test error');
			(executeChainModule.executeChain as jest.Mock).mockRejectedValue(error);

			mockExecuteFunction.continueOnFail.mockReturnValue(true);

			const result = await node.execute.call(mockExecuteFunction);

			expect(result).toEqual([[{ json: { error: 'Test error' }, pairedItem: { item: 0 } }]]);
		});

		it('should handle multiple response items from executeChain', async () => {
			(helperModule.getPromptInputByType as jest.Mock).mockReturnValue('Test prompt');

			(outputParserModule.getOptionalOutputParser as jest.Mock).mockResolvedValue(undefined);

			(executeChainModule.executeChain as jest.Mock).mockResolvedValue([
				'Response 1',
				'Response 2',
			]);

			const result = await node.execute.call(mockExecuteFunction);

			expect(result[0]).toHaveLength(2);
		});
	});
});
