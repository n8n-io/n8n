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
	describe('default behaviour (no opt-in) — non-parser errors unchanged', () => {
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

	describe('enrichNonParserErrors opt-in behaviour', () => {
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

		it('keeps the wrapped error reportable, since NodeOperationError defaults to a level the error reporter drops', () => {
			const wrapped = wrapLangChainParserError(new Error('Error'), node, 0, {
				enrichNonParserErrors: true,
			}) as NodeOperationError;

			expect(wrapped.level).toBe('error');
			expect(wrapped.shouldReport).toBe(true);
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

		it('uses constructor.name in the description for a custom subclass that inherits name "Error"', () => {
			class CustomAgentError extends Error {}
			const original = new CustomAgentError('boom');

			const wrapped = wrapLangChainParserError(original, node, undefined, {
				enrichNonParserErrors: true,
			});

			expect((wrapped as NodeOperationError).description).toBe('Original error: CustomAgentError');
			expect(getFailureType(wrapped)).toBe('CustomAgentError');
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

		it('keeps a named non-Error throw through the wrap instead of OperationalError', () => {
			const wrapped = wrapLangChainParserError({ name: 'RateLimitError' }, node, undefined, {
				enrichNonParserErrors: true,
			}) as NodeOperationError;

			expect(wrapped.message).toBe('Agent execution failed');
			expect(wrapped.description).toBe('Original error: RateLimitError');
			expect(wrapped.cause).toBeInstanceOf(Error);
			expect((wrapped.cause as Error).name).toBe('RateLimitError');
			expect(getFailureType(wrapped)).toBe('RateLimitError');
		});

		it('uses the fallback when a non-Error throw has no string message', () => {
			const wrapped = wrapLangChainParserError({ code: 500 }, node, undefined, {
				enrichNonParserErrors: true,
			});

			expect(wrapped).toBeInstanceOf(NodeOperationError);
			expect(wrapped.message).toBe('Agent execution failed');
			expect(wrapped.message).not.toBe('[object Object]');
		});

		it('uses a caller-supplied fallback message instead of the agent wording', () => {
			const cases = [new Error('Error'), new Error(''), { code: 500 }] as const;

			for (const original of cases) {
				const wrapped = wrapLangChainParserError(original, node, undefined, {
					enrichNonParserErrors: true,
					fallbackMessage: 'Model execution failed',
				});

				expect(wrapped.message).toBe('Model execution failed');
			}
		});

		it('keeps a useful original message even when a fallback message is supplied', () => {
			const wrapped = wrapLangChainParserError(new TypeError('fetch failed'), node, undefined, {
				enrichNonParserErrors: true,
				fallbackMessage: 'Model execution failed',
			});

			expect(wrapped.message).toBe('fetch failed');
			expect((wrapped as NodeOperationError).description).toBe('Original error: TypeError');
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

	it('uses constructor.name for a custom subclass that inherits name "Error"', () => {
		class CustomAgentError extends Error {}

		expect(getFailureType(new CustomAgentError('boom'))).toBe('CustomAgentError');
	});

	it('keeps an explicitly set name over constructor.name', () => {
		class CustomAgentError extends Error {
			constructor(message?: string) {
				super(message);
				this.name = 'ExplicitFailure';
			}
		}

		expect(getFailureType(new CustomAgentError('boom'))).toBe('ExplicitFailure');
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

	it('stops walking a cause chain that loops back on itself', () => {
		const inner = new TypeError('inner');
		const outer = new RangeError('outer');
		inner.cause = outer;
		outer.cause = inner;

		expect(getFailureType(outer)).toBe('TypeError');
	});

	it('falls back to typeof for non-Error throws', () => {
		expect(getFailureType('a string')).toBe('string');
		expect(getFailureType(undefined)).toBe('undefined');
	});

	it('uses a name on a thrown plain object', () => {
		expect(getFailureType({ name: 'RateLimitError' })).toBe('RateLimitError');
	});

	it('falls back to "Error" when the class name is empty', () => {
		const error = new Error();
		Object.defineProperty(error, 'name', { value: '' });

		expect(getFailureType(error)).toBe('Error');
	});
});
