import { Eval } from '../sdk/eval';

/**
 * Dice coefficient string similarity — measures overlap of bigrams between
 * two strings. Returns 0-1 where 1 is identical.
 */
function diceSimilarity(a: string, b: string): number {
	const normalA = a.toLowerCase().trim();
	const normalB = b.toLowerCase().trim();

	if (normalA === normalB) return 1;
	if (normalA.length < 2 || normalB.length < 2) return 0;

	const bigrams = (s: string): Set<string> => {
		const set = new Set<string>();
		for (let i = 0; i < s.length - 1; i++) {
			set.add(s.slice(i, i + 2));
		}
		return set;
	};

	const aBigrams = bigrams(normalA);
	const bBigrams = bigrams(normalB);
	let intersection = 0;
	for (const bg of aBigrams) {
		if (bBigrams.has(bg)) intersection++;
	}

	return (2 * intersection) / (aBigrams.size + bBigrams.size);
}

/** Deterministic string similarity eval using Dice coefficient. */
export function stringSimilarity(): Eval {
	return new Eval('string-similarity')
		.description('Measures string similarity between output and expected answer')
		.check(({ output, expected }) => {
			if (expected === undefined) {
				return { pass: false, reasoning: 'No expected value provided' };
			}
			const similarity = diceSimilarity(output, expected);
			return {
				pass: similarity >= 0.7,
				reasoning: `Dice similarity: ${(similarity * 100).toFixed(1)}%`,
			};
		});
}
