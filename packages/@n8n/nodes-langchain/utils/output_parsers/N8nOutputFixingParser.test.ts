/* eslint-disable @typescript-eslint/unbound-method */

import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { AIMessage } from '@langchain/core/messages';
import { OutputParserException } from '@langchain/core/output_parsers';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';
import type { MockProxy } from 'vitest-mock-extended';

import { N8nOutputFixingParser } from './N8nOutputFixingParser';
import type { N8nStructuredOutputParser } from './N8nStructuredOutputParser';
import { NAIVE_FIX_PROMPT } from './prompt';

describe('N8nOutputFixingParser', () => {
	let context: MockProxy<ISupplyDataFunctions>;
	let model: MockProxy<BaseLanguageModel>;
	let structuredParser: MockProxy<N8nStructuredOutputParser>;
	let parser: N8nOutputFixingParser;

	beforeEach(() => {
		context = mock<ISupplyDataFunctions>();
		model = mock<BaseLanguageModel>();
		structuredParser = mock<N8nStructuredOutputParser>();
		context.addInputData.mockReturnValue({ index: 0 });
		context.addOutputData.mockReturnValue();
		parser = new N8nOutputFixingParser(context, model, structuredParser, NAIVE_FIX_PROMPT);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	function mockRetryChainResult(message: AIMessage) {
		parser.getRetryChain = vi.fn().mockReturnValue({
			invoke: vi.fn().mockResolvedValue(message),
		});
	}

	// Responses API content blocks were coerced to "[object Object]" before re-parsing.
	it('extracts text from content-block array responses before re-parsing', async () => {
		const validOutput = { name: 'Bob', age: 28 };
		const fixedJson = JSON.stringify(validOutput);

		structuredParser.parse
			.mockRejectedValueOnce(new OutputParserException('Invalid JSON'))
			.mockResolvedValueOnce(validOutput);
		mockRetryChainResult(new AIMessage({ content: [{ type: 'text', text: fixedJson }] }));

		const result = await parser.parse('Some narration then {"name":"Bob","age":28}');

		expect(result).toEqual(validOutput);
		expect(structuredParser.parse).toHaveBeenCalledTimes(2);
		// The fix must be re-parsed verbatim, not as "[object Object]".
		expect(structuredParser.parse.mock.calls[1][0]).toBe(fixedJson);
	});
});
