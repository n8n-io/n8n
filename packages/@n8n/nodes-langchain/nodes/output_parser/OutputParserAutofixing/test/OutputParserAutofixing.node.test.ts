/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { OutputParserException } from '@langchain/core/output_parsers';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { normalizeItems } from 'n8n-core';
import type {
	ISupplyDataFunctions,
	IWorkflowDataProxyData,
	NodeConnectionType,
} from 'n8n-workflow';
import { ApplicationError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import type {
	N8nOutputFixingParser,
	N8nStructuredOutputParser,
} from '@utils/output_parsers/N8nOutputParser';

import { OutputParserAutofixing } from '../OutputParserAutofixing.node';
import { NAIVE_FIX_PROMPT } from '../prompt';

describe('OutputParserAutofixing', () => {
	let outputParser: OutputParserAutofixing;
	let thisArg: MockProxy<ISupplyDataFunctions>;
	let mockModel: MockProxy<BaseLanguageModel>;
	let mockStructuredOutputParser: MockProxy<N8nStructuredOutputParser>;

	beforeEach(() => {
		outputParser = new OutputParserAutofixing();
		thisArg = mock<ISupplyDataFunctions>({
			helpers: { normalizeItems },
		});
		mockModel = mock<BaseLanguageModel>();
		mockStructuredOutputParser = mock<N8nStructuredOutputParser>();

		thisArg.getWorkflowDataProxy.mockReturnValue(mock<IWorkflowDataProxyData>({ $input: mock() }));
		thisArg.addInputData.mockReturnValue({ index: 0 });
		thisArg.addOutputData.mockReturnValue();
		thisArg.getInputConnectionData.mockImplementation(async (type: NodeConnectionType) => {
			if (type === NodeConnectionTypes.AiLanguageModel) return mockModel;
			if (type === NodeConnectionTypes.AiOutputParser) return mockStructuredOutputParser;

			throw new ApplicationError('Unexpected connection type');
		});
		thisArg.getNodeParameter.mockReset();
		thisArg.getNodeParameter.mockImplementation((parameterName) => {
			if (parameterName === 'options.prompt') {
				return NAIVE_FIX_PROMPT;
			}
			throw new ApplicationError('Not implemented');
		});
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	function getMockedRetryChain(output: string) {
		return jest.fn().mockReturnValue({
			invoke: jest.fn().mockResolvedValue({
				content: output,
			}),
		});
	}

	describe('Configuration', () => {
		it('should throw error when prompt template does not contain {error} placeholder', async () => {
			thisArg.getNodeParameter.mockImplementation((parameterName) => {
				if (parameterName === 'options.prompt') {
					return 'Invalid prompt without error placeholder';
				}
				throw new ApplicationError('Not implemented');
			});

			await expect(outputParser.supplyData.call(thisArg, 0)).rejects.toThrow(
				new NodeOperationError(
					thisArg.getNode(),
					'Auto-fixing parser prompt has to contain {error} placeholder',
				),
			);
		});

		it('should throw error when prompt template is empty', async () => {
			thisArg.getNodeParameter.mockImplementation((parameterName) => {
				if (parameterName === 'options.prompt') {
					return '';
				}
				throw new ApplicationError('Not implemented');
			});

			await expect(outputParser.supplyData.call(thisArg, 0)).rejects.toThrow(
				new NodeOperationError(
					thisArg.getNode(),
					'Auto-fixing parser prompt has to contain {error} placeholder',
				),
			);
		});

		it('should use default prompt when none specified', async () => {
			thisArg.getNodeParameter.mockImplementation((parameterName) => {
				if (parameterName === 'options.prompt') {
					return NAIVE_FIX_PROMPT;
				}
				throw new ApplicationError('Not implemented');
			});

			const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
				response: N8nOutputFixingParser;
			};

			expect(response).toBeDefined();
		});
	});

	describe('Parsing', () => {
		it('should successfully parse valid output without needing to fix it', async () => {
			const validOutput = { name: 'Alice', age: 25 };

			mockStructuredOutputParser.parse.mockResolvedValueOnce(validOutput);

			const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
				response: N8nOutputFixingParser;
			};

			const result = await response.parse('{"name": "Alice", "age": 25}');

			expect(result).toEqual(validOutput);
			expect(mockStructuredOutputParser.parse).toHaveBeenCalledTimes(1);
		});

		it('should not retry on non-OutputParserException errors', async () => {
			const error = new Error('Some other error');
			mockStructuredOutputParser.parse.mockRejectedValueOnce(error);

			const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
				response: N8nOutputFixingParser;
			};

			await expect(response.parse('Invalid JSON string')).rejects.toThrow(error);
			expect(mockStructuredOutputParser.parse).toHaveBeenCalledTimes(1);
		});

		it('should retry on OutputParserException and succeed', async () => {
			const validOutput = { name: 'Bob', age: 28 };

			mockStructuredOutputParser.parse
				.mockRejectedValueOnce(new OutputParserException('Invalid JSON'))
				.mockResolvedValueOnce(validOutput);

			const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
				response: N8nOutputFixingParser;
			};

			response.getRetryChain = getMockedRetryChain(JSON.stringify(validOutput));

			const result = await response.parse('Invalid JSON string');

			expect(result).toEqual(validOutput);
			expect(mockStructuredOutputParser.parse).toHaveBeenCalledTimes(2);
		});

		it('should handle failed retry attempt', async () => {
			mockStructuredOutputParser.parse
				.mockRejectedValueOnce(new OutputParserException('Invalid JSON'))
				.mockRejectedValueOnce(new Error('Still invalid JSON'));

			const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
				response: N8nOutputFixingParser;
			};

			response.getRetryChain = getMockedRetryChain('Still not valid JSON');

			await expect(response.parse('Invalid JSON string')).rejects.toThrow('Still invalid JSON');
			expect(mockStructuredOutputParser.parse).toHaveBeenCalledTimes(2);
		});

		it('should throw non-OutputParserException errors immediately without retry', async () => {
			const customError = new Error('Database connection error');
			const retryChainSpy = jest.fn();

			mockStructuredOutputParser.parse.mockRejectedValueOnce(customError);

			const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
				response: N8nOutputFixingParser;
			};

			response.getRetryChain = retryChainSpy;

			await expect(response.parse('Some input')).rejects.toThrow('Database connection error');
			expect(mockStructuredOutputParser.parse).toHaveBeenCalledTimes(1);
			expect(retryChainSpy).not.toHaveBeenCalled();
		});
	});
});
