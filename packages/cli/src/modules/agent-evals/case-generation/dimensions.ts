/**
 * Dimension-tuple synthesis for draft eval cases.
 *
 * Instead of asking the model for "N test queries" in one shot — which tends to
 * return near-duplicates clustered on the happy path — we vary the cases along
 * independent axes and generate one case per (capability, difficulty, flavor)
 * tuple. The tuple set is sampled *in code* (deterministically), so coverage is
 * predictable and testable; the model only fills each tuple with concrete text.
 */

/** How much work a case implies for the agent. */
export type CaseDifficulty = 'simple' | 'multi_step';

/**
 * The shape of the user input, so the sample spans well-formed requests as well
 * as the messy ones a real agent has to cope with.
 */
export type CaseInputFlavor = 'happy_path' | 'underspecified' | 'out_of_scope' | 'adversarial';

/** One point in the dimension space; becomes exactly one generated case. */
export interface DimensionTuple {
	/** A capability of the agent (tool/skill name), or `general` when it has none. */
	capability: string;
	difficulty: CaseDifficulty;
	flavor: CaseInputFlavor;
}

export const CASE_DIFFICULTIES: readonly CaseDifficulty[] = ['simple', 'multi_step'];
export const CASE_INPUT_FLAVORS: readonly CaseInputFlavor[] = [
	'happy_path',
	'underspecified',
	'out_of_scope',
	'adversarial',
];

/** Fallback capability label when the agent config declares no tools/skills. */
export const GENERAL_CAPABILITY = 'general';

/**
 * Sample `count` dimension tuples, spread evenly across the full
 * capability × difficulty × flavor grid.
 *
 * Deterministic: same inputs → same tuples (no randomness), so the generator is
 * reproducible and unit-testable. Each axis advances independently (round-robin)
 * so even a short sample spans every capability, difficulty, and flavor; when a
 * combination repeats it walks to the next unused grid cell, keeping the tuples
 * distinct until the grid is exhausted, after which the grid is cycled.
 */
export function sampleDimensionTuples(capabilities: string[], count: number): DimensionTuple[] {
	if (count <= 0) return [];

	const caps = capabilities.length > 0 ? capabilities : [GENERAL_CAPABILITY];
	const nCaps = caps.length;
	const nDiff = CASE_DIFFICULTIES.length;
	const nFlavors = CASE_INPUT_FLAVORS.length;
	const gridSize = nCaps * nDiff * nFlavors;

	const key = (c: number, d: number, f: number) => `${c}:${d}:${f}`;
	const seen = new Set<string>();
	const tuples: DimensionTuple[] = [];

	for (let i = 0; i < count; i++) {
		// Once every combination has been used, cycle the distinct tuples already
		// produced rather than inventing repeats in an arbitrary order.
		if (tuples.length >= gridSize) {
			tuples.push(tuples[i % gridSize]);
			continue;
		}

		// Preferred position. Capability cycles fastest so a short sample spreads
		// across capabilities. Difficulty advances once per full capability cycle
		// (`floor(i / nCaps)`) rather than per step, so it stays decorrelated from
		// capability — otherwise, e.g., 2 capabilities would each lock to a single
		// difficulty. Flavor cycles fastest of all.
		let c = i % nCaps;
		let d = Math.floor(i / nCaps) % nDiff;
		let f = i % nFlavors;

		// If that combination is taken, walk the grid (flavor-fastest) to the next
		// unused cell. A free cell is guaranteed while `tuples.length < gridSize`.
		while (seen.has(key(c, d, f))) {
			f += 1;
			if (f === nFlavors) {
				f = 0;
				d += 1;
			}
			if (d === nDiff) {
				d = 0;
				c += 1;
			}
			if (c === nCaps) c = 0;
		}

		seen.add(key(c, d, f));
		tuples.push({
			capability: caps[c],
			difficulty: CASE_DIFFICULTIES[d],
			flavor: CASE_INPUT_FLAVORS[f],
		});
	}

	return tuples;
}
