/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { normalizeItems } from 'n8n-core';
import type { IExecuteFunctions, IWorkflowDataProxyData } from 'n8n-workflow';
import { ApplicationError, NodeConnectionType } from 'n8n-workflow';

import { N8nOutputFixingParser } from '../../../../utils/output_parsers/N8nOutputParser';
import type { N8nStructuredOutputParser } from '../../../../utils/output_parsers/N8nOutputParser';
import { OutputParserAutofixing } from '../OutputParserAutofixing.node';

describe('OutputParserAutofixing', () => {
	let outputParser: OutputParserAutofixing;
	let thisArg: MockProxy<IExecuteFunctions>;
	let mockModel: MockProxy<BaseLanguageModel>;
	let mockStructuredOutputParser: MockProxy<N8nStructuredOutputParser>;

	beforeEach(() => {
		outputParser = new OutputParserAutofixing();
		thisArg = mock<IExecuteFunctions>({
			helpers: { normalizeItems },
		});
		mockModel = mock<BaseLanguageModel>();
		mockStructuredOutputParser = mock<N8nStructuredOutputParser>();

		thisArg.getWorkflowDataProxy.mockReturnValue(mock<IWorkflowDataProxyData>({ $input: mock() }));
		thisArg.addInputData.mockReturnValue({ index: 0 });
		thisArg.addOutputData.mockReturnValue();
		thisArg.getInputConnectionData.mockImplementation(async (type: NodeConnectionType) => {
			if (type === NodeConnectionType.AiLanguageModel) return mockModel;
			if (type === NodeConnectionType.AiOutputParser) return mockStructuredOutputParser;

			throw new ApplicationError('Unexpected connection type');
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

	it('should successfully parse valid output without needing to fix it', async () => {
		const validOutput = { name: 'Alice', age: 25 };

		mockStructuredOutputParser.parse.mockResolvedValueOnce(validOutput);

		const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
			response: N8nOutputFixingParser;
		};

		// Ensure the response contains the output-fixing parser
		expect(response).toBeDefined();
		expect(response).toBeInstanceOf(N8nOutputFixingParser);

		const result = await response.parse('{"name": "Alice", "age": 25}');

		// Validate that the parser succeeds without retry
		expect(result).toEqual(validOutput);
		expect(mockStructuredOutputParser.parse).toHaveBeenCalledTimes(1); // Only one call to parse
	});

	it('should throw an error when both structured parser and fixing parser fail', async () => {
		mockStructuredOutputParser.parse
			.mockRejectedValueOnce(new Error('Invalid JSON')) // First attempt fails
			.mockRejectedValueOnce(new Error('Fixing attempt failed')); // Second attempt fails

		const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
			response: N8nOutputFixingParser;
		};

		response.getRetryChain = getMockedRetryChain('{}');

		await expect(response.parse('Invalid JSON string')).rejects.toThrow('Fixing attempt failed');
		expect(mockStructuredOutputParser.parse).toHaveBeenCalledTimes(2);
	});

	it('should reject on the first attempt and succeed on retry with the parsed content', async () => {
		const validOutput = { name: 'Bob', age: 28 };

		mockStructuredOutputParser.parse.mockRejectedValueOnce(new Error('Invalid JSON'));

		const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
			response: N8nOutputFixingParser;
		};

		response.getRetryChain = getMockedRetryChain(JSON.stringify(validOutput));

		mockStructuredOutputParser.parse.mockResolvedValueOnce(validOutput);

		const result = await response.parse('Invalid JSON string');

		expect(result).toEqual(validOutput);
		expect(mockStructuredOutputParser.parse).toHaveBeenCalledTimes(2); // First fails, second succeeds
	});

	it('should handle non-JSON formatted response from fixing parser', async () => {
		mockStructuredOutputParser.parse.mockRejectedValueOnce(new Error('Invalid JSON'));

		const { response } = (await outputParser.supplyData.call(thisArg, 0)) as {
			response: N8nOutputFixingParser;
		};

		response.getRetryChain = getMockedRetryChain('This is not JSON');

		mockStructuredOutputParser.parse.mockRejectedValueOnce(new Error('Unexpected token'));

		// Expect the structured parser to throw an error on invalid JSON from retry
		await expect(response.parse('Invalid JSON string')).rejects.toThrow('Unexpected token');
		expect(mockStructuredOutputParser.parse).toHaveBeenCalledTimes(2); // First fails, second tries and fails
	});
});
