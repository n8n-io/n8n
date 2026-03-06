import { Eval } from '../eval';
import * as builtinEvals from '../evals/index';

describe('Eval', () => {
	describe('deterministic (.check())', () => {
		it('should return pass/fail with a check function', async () => {
			const ev = new Eval('always-pass')
				.description('Always passes')
				.check(() => ({ pass: true, reasoning: 'Always passes' }));

			const result = await ev.run({ input: 'test', output: 'test' });
			expect(result.pass).toBe(true);
			expect(result.reasoning).toBe('Always passes');
		});

		it('should pass eval input to check function', async () => {
			const ev = new Eval('match-check').check(({ output, expected }) => ({
				pass: output === expected,
				reasoning: `output=${output}, expected=${expected}`,
			}));

			const result = await ev.run({ input: 'q', output: 'hello', expected: 'hello' });
			expect(result.pass).toBe(true);
		});

		it('should throw if neither check nor judge is set', async () => {
			const ev = new Eval('empty');
			await expect(ev.run({ input: 'test', output: 'test' })).rejects.toThrow(
				'requires either .check() or .judge()',
			);
		});

		it('should throw if both check and judge are set', () => {
			const ev = new Eval('both').check(() => ({ pass: true, reasoning: 'ok' }));
			// eslint-disable-next-line @typescript-eslint/require-await
			expect(() => ev.judge(async () => ({ pass: true, reasoning: 'ok' }))).toThrow(
				'cannot use both',
			);
		});
	});

	describe('LLM-as-judge (.judge())', () => {
		it('should throw if model is missing', async () => {
			const ev = new Eval('no-model').judge(async ({ llm }) => {
				const r = await llm('test');
				return { pass: true, reasoning: r.text };
			});

			await expect(ev.run({ input: 'test', output: 'test' })).rejects.toThrow(
				'no .model() was set',
			);
		});
	});
});

describe('Built-in deterministic evals', () => {
	describe('stringSimilarity', () => {
		it('should pass for identical strings', async () => {
			const ev = builtinEvals.stringSimilarity();
			const result = await ev.run({ input: 'q', output: 'hello', expected: 'hello' });
			expect(result.pass).toBe(true);
		});

		it('should fail for completely different strings', async () => {
			const ev = builtinEvals.stringSimilarity();
			const result = await ev.run({ input: 'q', output: 'abc', expected: 'xyz' });
			expect(result.pass).toBe(false);
		});

		it('should pass for sufficiently similar strings', async () => {
			const ev = builtinEvals.stringSimilarity();
			const result = await ev.run({
				input: 'q',
				output: 'The capital is Paris',
				expected: 'The capital is Paris!',
			});
			expect(result.pass).toBe(true);
		});

		it('should fail for dissimilar strings', async () => {
			const ev = builtinEvals.stringSimilarity();
			const result = await ev.run({ input: 'q', output: 'hello world', expected: 'goodbye moon' });
			expect(result.pass).toBe(false);
		});
	});

	describe('categorization', () => {
		it('should pass for exact match', async () => {
			const ev = builtinEvals.categorization();
			const result = await ev.run({ input: 'q', output: 'positive', expected: 'positive' });
			expect(result.pass).toBe(true);
		});

		it('should be case-insensitive', async () => {
			const ev = builtinEvals.categorization();
			const result = await ev.run({ input: 'q', output: 'Positive', expected: 'positive' });
			expect(result.pass).toBe(true);
		});

		it('should pass when expected is contained in output', async () => {
			const ev = builtinEvals.categorization();
			const result = await ev.run({
				input: 'q',
				output: 'The sentiment is positive.',
				expected: 'positive',
			});
			expect(result.pass).toBe(true);
		});
	});

	describe('containsKeywords', () => {
		it('should fail when not all keywords are present', async () => {
			const ev = builtinEvals.containsKeywords();
			const result = await ev.run({
				input: 'q',
				output: 'The cat sat on the mat',
				expected: 'cat, mat, dog',
			});
			expect(result.pass).toBe(false);
			expect(result.reasoning).toContain('dog');
		});

		it('should pass when all keywords are present', async () => {
			const ev = builtinEvals.containsKeywords();
			const result = await ev.run({
				input: 'q',
				output: 'The cat sat on the mat',
				expected: 'cat, mat',
			});
			expect(result.pass).toBe(true);
		});
	});

	describe('jsonValidity', () => {
		it('should pass for valid JSON', async () => {
			const ev = builtinEvals.jsonValidity();
			const result = await ev.run({ input: 'q', output: '{"name":"test"}' });
			expect(result.pass).toBe(true);
		});

		it('should fail for invalid JSON', async () => {
			const ev = builtinEvals.jsonValidity();
			const result = await ev.run({ input: 'q', output: 'not json' });
			expect(result.pass).toBe(false);
		});
	});

	describe('toolCallAccuracy', () => {
		it('should fail when not all expected tools were called', async () => {
			const ev = builtinEvals.toolCallAccuracy();
			const result = await ev.run({
				input: 'q',
				output: 'done',
				expected: 'search, calculate',
				toolCalls: [
					{ tool: 'search', input: {}, output: {} },
					{ tool: 'format', input: {}, output: {} },
				],
			});
			expect(result.pass).toBe(false);
			expect(result.reasoning).toContain('calculate');
		});

		it('should pass when all expected tools were called', async () => {
			const ev = builtinEvals.toolCallAccuracy();
			const result = await ev.run({
				input: 'q',
				output: 'done',
				expected: 'search',
				toolCalls: [{ tool: 'search', input: {}, output: {} }],
			});
			expect(result.pass).toBe(true);
		});
	});
});

// evaluate() is tested in integration tests (src/__tests__/integration/evaluate.test.ts)
// which run against real LLM providers with proper streaming support.
