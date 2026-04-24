import { Eval } from '../sdk/eval';

/**
 * Deterministic keyword presence eval.
 * Expects `expected` to be a comma-separated list of keywords.
 * Passes only if ALL keywords are found in the output.
 */
export function containsKeywords(): Eval {
	return new Eval('contains-keywords')
		.description('Checks if output contains all expected keywords')
		.check(({ output, expected }) => {
			if (!expected) {
				return { pass: false, reasoning: 'No expected keywords provided' };
			}

			const keywords = expected
				.split(',')
				.map((k) => k.trim().toLowerCase())
				.filter(Boolean);
			if (keywords.length === 0) {
				return { pass: false, reasoning: 'No keywords to check' };
			}

			const normalOutput = output.toLowerCase();
			const missing = keywords.filter((k) => !normalOutput.includes(k));

			return {
				pass: missing.length === 0,
				reasoning:
					missing.length === 0
						? `All ${keywords.length} keywords found`
						: `Missing ${missing.length}/${keywords.length} keywords: ${missing.join(', ')}`,
			};
		});
}
