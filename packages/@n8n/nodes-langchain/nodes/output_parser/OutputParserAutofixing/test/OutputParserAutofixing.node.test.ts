/* eslint-disable @typescript-eslint/no-unsafe-call */
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import { normalizeItems } from 'n8n-core';
import type { IExecuteFunctions, IWorkflowDataProxyData } from 'n8n-workflow';
import { ApplicationError, NodeConnectionType } from 'n8n-workflow';

import type {
	N8nOutputFixingParser,
	N8nStructuredOutputParser,
} from '../../../../utils/output_parsers/N8nOutputParser';
import { OutputParserAutofixing } from '../OutputParserAutofixing.node';

// Mock the entire module
jest.mock('../../../../utils/output_parsers/N8nOutputParser');

describe('OutputParserAutofixing', () => {
	let outputParser: OutputParserAutofixing;
	let thisArg: MockProxy<IExecuteFunctions>;
	let mockModel: MockProxy<BaseLanguageModel>;
	let mockStructuredOutputParser: MockProxy<N8nStructuredOutputParser>;
	let mockN8nOutputFixingParser: jest.SpyInstance;

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

		// Create a mock for N8nOutputFixingParser
		mockN8nOutputFixingParser = jest.spyOn(
			// eslint-disable-next-line @typescript-eslint/no-var-requires
			require('../../../../utils/output_parsers/N8nOutputParser'),
			'N8nOutputFixingParser',
		);
		mockN8nOutputFixingParser.mockImplementation(() => ({
			parse: jest.fn(),
		}));
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	let mockFixingParser: { parse: jest.Mock };

	beforeEach(() => {
		mockFixingParser = { parse: jest.fn() };
		mockN8nOutputFixingParser.mockReturnValue(mockFixingParser);
	});

	it('should successfully parse valid output', async () => {
		const validOutput = { name: 'John', age: 30 };
		mockFixingParser.parse.mockResolvedValue(validOutput);

		const { response } = await outputParser.supplyData.call(thisArg, 0);
		const result = await (response as N8nOutputFixingParser).parse('{"name": "John", "age": 30}');

		expect(result).toEqual(validOutput);
		expect(mockFixingParser.parse).toHaveBeenCalledTimes(1);
	});

	it('should attempt to fix and parse invalid output', async () => {
		const validOutput = { name: 'John', age: 30 };
		mockFixingParser.parse.mockResolvedValue(validOutput);

		const { response } = await outputParser.supplyData.call(thisArg, 0);
		const result = await (response as N8nOutputFixingParser).parse('Invalid JSON string');

		expect(result).toEqual(validOutput);
		expect(mockFixingParser.parse).toHaveBeenCalledTimes(1);
	});

	it('should throw an error if fixing fails', async () => {
		mockFixingParser.parse.mockRejectedValue(new Error('Invalid JSON'));

		const { response } = await outputParser.supplyData.call(thisArg, 0);

		await expect((response as N8nOutputFixingParser).parse('Invalid JSON string')).rejects.toThrow(
			'Invalid JSON',
		);
		expect(mockFixingParser.parse).toHaveBeenCalledTimes(1);
	});
});
