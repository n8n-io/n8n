import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	MODEL_OUTPUT_PARSER_ERROR_MESSAGE,
	wrapLangChainParserError,
} from './langchainParserError';

const node = {
	name: 'Test Node',
	type: 'n8n-nodes-langchain.agent',
	typeVersion: 1,
	position: [0, 0],
} as INode;

describe('wrapLangChainParserError', () => {
	it('wraps parser errors without exposing raw model output', () => {
		const rawModelOutput = 'customer secret in model output';
		const error = new Error(`Failed to parse. Text: "${rawModelOutput}"`);

		const wrappedError = wrapLangChainParserError(error, node, 2);

		expect(wrappedError).toBeInstanceOf(NodeOperationError);
		expect(wrappedError.message).toBe(MODEL_OUTPUT_PARSER_ERROR_MESSAGE);
		expect(wrappedError.message).not.toContain(rawModelOutput);
		expect((wrappedError as NodeOperationError).description).not.toContain(rawModelOutput);
		expect((wrappedError as NodeOperationError).context.itemIndex).toBe(2);
	});

	it('wraps parser errors detected by name', () => {
		const wrappedError = wrapLangChainParserError(
			{ name: 'OutputParserException', message: 'Parser failed' },
			node,
		);

		expect(wrappedError.message).toBe(MODEL_OUTPUT_PARSER_ERROR_MESSAGE);
	});

	it('leaves non-parser errors unchanged', () => {
		const error = new Error('Connection failed');

		expect(wrapLangChainParserError(error, node)).toBe(error);
	});
});
