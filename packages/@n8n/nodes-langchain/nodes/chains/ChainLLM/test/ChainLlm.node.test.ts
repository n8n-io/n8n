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
import * as responseFormatterModule from '../methods/responseFormatter';

jest.mock('@utils/helpers', () => ({
	getPromptInputByType: jest.fn(),
}));

jest.mock('@utils/output_parsers/N8nOutputParser', () => ({
	getOptionalOutputParser: jest.fn(),
}));

jest.mock('../methods/chainExecutor', () => ({
	executeChain: jest.fn(),
}));

jest.mock('../methods/responseFormatter', () => ({
	formatResponse: jest.fn().mockImplementation((response) => {
		if (typeof response === 'string') {
			return { text: response.trim() };
		}
		return response;
	}),
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

		it('should unwrap object responses when node version is 1.6 or higher', async () => {
			mockExecuteFunction.getNode.mockReturnValue({
				name: 'Chain LLM',
				typeVersion: 1.6,
				parameters: {},
			} as INode);

			(helperModule.getPromptInputByType as jest.Mock).mockReturnValue('Test prompt');
			(outputParserModule.getOptionalOutputParser as jest.Mock).mockResolvedValue(undefined);

			const structuredResponse = {
				person: { name: 'John', age: 30 },
				items: ['item1', 'item2'],
				active: true,
			};

			(executeChainModule.executeChain as jest.Mock).mockResolvedValue([structuredResponse]);

			const formatResponseSpy = jest.spyOn(responseFormatterModule, 'formatResponse');

			await node.execute.call(mockExecuteFunction);

			expect(formatResponseSpy).toHaveBeenCalledWith(structuredResponse, true);
		});

		it('should unwrap object responses when output parser is provided regardless of version', async () => {
			mockExecuteFunction.getNode.mockReturnValue({
				name: 'Chain LLM',
				typeVersion: 1.5,
				parameters: {},
			} as INode);

			(helperModule.getPromptInputByType as jest.Mock).mockReturnValue('Test prompt');

			(outputParserModule.getOptionalOutputParser as jest.Mock).mockResolvedValue(
				mock<outputParserModule.N8nOutputParser>(),
			);

			const structuredResponse = {
				result: 'success',
				data: { key: 'value' },
			};

			(executeChainModule.executeChain as jest.Mock).mockResolvedValue([structuredResponse]);

			const formatResponseSpy = jest.spyOn(responseFormatterModule, 'formatResponse');

			await node.execute.call(mockExecuteFunction);

			expect(formatResponseSpy).toHaveBeenCalledWith(structuredResponse, true);
		});

		it('should wrap object responses as text when node version is lower than 1.6 and no output parser', async () => {
			mockExecuteFunction.getNode.mockReturnValue({
				name: 'Chain LLM',
				typeVersion: 1.5,
				parameters: {},
			} as INode);

			(helperModule.getPromptInputByType as jest.Mock).mockReturnValue('Test prompt');
			(outputParserModule.getOptionalOutputParser as jest.Mock).mockResolvedValue(undefined);

			const structuredResponse = {
				person: { name: 'John', age: 30 },
				items: ['item1', 'item2'],
			};

			(executeChainModule.executeChain as jest.Mock).mockResolvedValue([structuredResponse]);

			const formatResponseSpy = jest.spyOn(responseFormatterModule, 'formatResponse');

			await node.execute.call(mockExecuteFunction);

			expect(formatResponseSpy).toHaveBeenCalledWith(structuredResponse, false);
		});

		it('should handle a mix of different response types with the correct wrapping', async () => {
			mockExecuteFunction.getNode.mockReturnValue({
				name: 'Chain LLM',
				typeVersion: 1.6,
				parameters: {},
			} as INode);

			(helperModule.getPromptInputByType as jest.Mock).mockReturnValue('Test prompt');
			(outputParserModule.getOptionalOutputParser as jest.Mock).mockResolvedValue(undefined);

			const mixedResponses = ['Text response', { structured: 'object' }, ['array', 'response']];

			(executeChainModule.executeChain as jest.Mock).mockResolvedValue(mixedResponses);

			(responseFormatterModule.formatResponse as jest.Mock).mockClear();

			await node.execute.call(mockExecuteFunction);

			expect(responseFormatterModule.formatResponse).toHaveBeenCalledTimes(3);
			expect(responseFormatterModule.formatResponse).toHaveBeenNthCalledWith(
				1,
				'Text response',
				true,
			);
			expect(responseFormatterModule.formatResponse).toHaveBeenNthCalledWith(
				2,
				{ structured: 'object' },
				true,
			);
			expect(responseFormatterModule.formatResponse).toHaveBeenNthCalledWith(
				3,
				['array', 'response'],
				true,
			);
		});

		it('should handle LLM responses containing JSON with markdown content', async () => {
			mockExecuteFunction.getNode.mockReturnValue({
				name: 'Chain LLM',
				typeVersion: 1.6,
				parameters: {},
			} as INode);

			(helperModule.getPromptInputByType as jest.Mock).mockReturnValue(
				'Generate markdown documentation',
			);
			(outputParserModule.getOptionalOutputParser as jest.Mock).mockResolvedValue(undefined);

			const markdownResponse = {
				title: 'API Documentation',
				sections: [
					{
						name: 'Authentication',
						content:
							"# Authentication\n\nUse API keys for all requests:\n\n```javascript\nconst headers = {\n  'Authorization': 'Bearer YOUR_API_KEY'\n};\n```",
					},
					{
						name: 'Endpoints',
						content:
							'## Available Endpoints\n\n* GET /users - List all users\n* POST /users - Create a user\n* GET /users/{id} - Get user details',
					},
				],
				examples: {
					curl: "```bash\ncurl -X GET https://api.example.com/users \\\n  -H 'Authorization: Bearer YOUR_API_KEY'\n```",
					response: '```json\n{\n  "users": [],\n  "count": 0\n}\n```',
				},
			};

			(executeChainModule.executeChain as jest.Mock).mockResolvedValue([markdownResponse]);

			(responseFormatterModule.formatResponse as jest.Mock).mockImplementation(
				(response, shouldUnwrap) => {
					if (shouldUnwrap && typeof response === 'object') {
						return response;
					}
					return { text: JSON.stringify(response) };
				},
			);

			const result = await node.execute.call(mockExecuteFunction);

			expect(result).toEqual([
				[
					{
						json: markdownResponse,
					},
				],
			]);

			expect(responseFormatterModule.formatResponse).toHaveBeenCalledWith(markdownResponse, true);
		});
	});
});
