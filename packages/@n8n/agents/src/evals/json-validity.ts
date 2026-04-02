import { Eval } from '../sdk/eval';

/** Deterministic JSON validity eval — checks if the output is parseable JSON. */
export function jsonValidity(): Eval {
	return new Eval('json-validity')
		.description('Checks if output is valid JSON')
		.check(({ output }) => {
			try {
				JSON.parse(output);
				return { pass: true, reasoning: 'Valid JSON' };
			} catch (e) {
				return {
					pass: false,
					reasoning: `Invalid JSON: ${e instanceof Error ? e.message : 'parse error'}`,
				};
			}
		});
}
