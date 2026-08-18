import type { INode } from 'n8n-workflow';
import { BaseError, NodeOperationError } from 'n8n-workflow';

import {
	MODEL_OUTPUT_PARSER_ERROR_MESSAGE,
	getFailureType,
	wrapLangChainParserError,
} from './langchainParserError';

const node = {
	name: 'Test Node',
	type: 'n8n-nodes-langchain.agent',
	typeVersion: 1,
	position: [0, 0],
} as INode;

describe('wrapLangChainParserError', () => {
	describe('default (V1/V2) behaviour — non-parser errors unchanged', () => {
		it('leaves non-parser Error instances unchanged', () => {
			const error = new Error('Connection failed');

			expect(wrapLangChainParserError(error, node)).toBe(error);
		});

		it('wraps non-Error throws in a plain Error with the message', () => {
			const wrapped = wrapLangChainParserError({ message: 'something broke' }, node);

			expect(wrapped).toBeInstanceOf(Error);
			expect(wrapped.message).toBe('something broke');
		});
	});

	describe('parser errors', () => {
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
	});

	describe('enrichNonParserErrors (V3) behaviour', () => {
		it('wraps a plain Error with a useful message in NodeOperationError and chains the cause', () => {
			const original = new Error('Connection failed');

			const wrapped = wrapLangChainParserError(original, node, 3, {
				enrichNonParserErrors: true,
			});

			expect(wrapped).toBeInstanceOf(NodeOperationError);
			expect(wrapped).not.toBe(original);
			expect(wrapped.message).toBe('Connection failed');
			expect((wrapped as NodeOperationError).cause).toBe(original);
			expect((wrapped as NodeOperationError).description).toBe('Original error: Error');
			expect((wrapped as NodeOperationError).context.itemIndex).toBe(3);
		});

		it('uses a fallback message when the original message is empty or matches the class name', () => {
			const cases = [new Error('Error'), new Error(''), new Error()] as const;

			for (const original of cases) {
				const wrapped = wrapLangChainParserError(original, node, undefined, {
					enrichNonParserErrors: true,
				});

				expect(wrapped).toBeInstanceOf(NodeOperationError);
				expect(wrapped.message).toBe('Agent execution failed');
				expect((wrapped as NodeOperationError).cause).toBe(original);
				expect((wrapped as NodeOperationError).description).toBe('Original error: Error');
			}
		});

		it('preserves the underlying class name in the description', () => {
			const original = new TypeError('not a function');

			const wrapped = wrapLangChainParserError(original, node, undefined, {
				enrichNonParserErrors: true,
			});

			expect(wrapped.message).toBe('not a function');
			expect((wrapped as NodeOperationError).description).toBe('Original error: TypeError');
			expect((wrapped as NodeOperationError).cause).toBe(original);
		});

		it('returns BaseError subclasses unchanged', () => {
			class CustomBaseError extends BaseError {
				constructor() {
					super('already enriched');
				}
			}
			const original = new CustomBaseError();

			expect(
				wrapLangChainParserError(original, node, undefined, { enrichNonParserErrors: true }),
			).toBe(original);
		});

		it('wraps non-Error throws with the extracted message', () => {
			const wrapped = wrapLangChainParserError({ message: 'something broke' }, node, undefined, {
				enrichNonParserErrors: true,
			});

			expect(wrapped).toBeInstanceOf(NodeOperationError);
			expect(wrapped.message).toBe('something broke');
		});

		it('still wraps parser errors when the option is set', () => {
			const error = new Error('Failed to parse. Text: "x"');

			const wrapped = wrapLangChainParserError(error, node, undefined, {
				enrichNonParserErrors: true,
			});

			expect(wrapped).toBeInstanceOf(NodeOperationError);
			expect(wrapped.message).toBe(MODEL_OUTPUT_PARSER_ERROR_MESSAGE);
		});
	});
});

describe('getFailureType', () => {
	it('returns the class name of a plain Error', () => {
		expect(getFailureType(new Error('boom'))).toBe('Error');
	});

	it('returns the class name of a typed Error', () => {
		expect(getFailureType(new TypeError('x'))).toBe('TypeError');
	});

	it('walks the cause chain through a NodeOperationError to the underlying class', () => {
		const root = new TypeError('root cause');
		const wrapped = new NodeOperationError(node, root, { message: 'wrapped' });

		expect(getFailureType(wrapped)).toBe('TypeError');
	});

	it('walks a multi-level cause chain to the deepest class', () => {
		const deepest = new RangeError('deepest');
		const mid = new Error('mid');
		(mid as Error & { cause: Error }).cause = deepest;
		const top = new Error('top');
		(top as Error & { cause: Error }).cause = mid;

		expect(getFailureType(top)).toBe('RangeError');
	});

	it('falls back to typeof for non-Error throws', () => {
		expect(getFailureType('a string')).toBe('string');
		expect(getFailureType(undefined)).toBe('undefined');
	});

	it('falls back to "Error" when the class name is empty', () => {
		const error = new Error();
		Object.defineProperty(error, 'name', { value: '' });

		expect(getFailureType(error)).toBe('Error');
	});
});
