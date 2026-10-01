import { Eval } from '../sdk/eval';

/** Deterministic categorization eval — checks if output matches the expected label. */
export function categorization(): Eval {
	return new Eval('categorization')
		.description('Checks if output matches the expected category label')
		.check(({ output, expected }) => {
			if (!expected) {
				return { pass: false, reasoning: 'No expected category provided' };
			}

			const normalOutput = output.toLowerCase().trim();
			const normalExpected = expected.toLowerCase().trim();

			if (normalOutput === normalExpected) {
				return { pass: true, reasoning: 'Exact match' };
			}

			if (normalOutput.includes(normalExpected)) {
				return { pass: true, reasoning: `Output contains expected label "${expected}"` };
			}

			return { pass: false, reasoning: `Expected "${expected}", got "${output}"` };
		});
}
