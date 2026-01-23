import type { NodeInstance } from './types/base';

/**
 * Marker interface for fan-in (multiple sources to one target input)
 */
export interface FanInSources {
	readonly _isFanIn: true;
	readonly sources: NodeInstance<string, string, unknown>[];
}

/**
 * Create a fan-in marker for connecting multiple sources to one merge input.
 *
 * This is a semantic helper that makes the intent explicit in generated code.
 * It wraps multiple source nodes to indicate they should all connect to
 * the same input slot of a merge node.
 *
 * @param sources - The source nodes that will all connect to the same merge input
 * @returns A FanInSources marker containing the sources
 *
 * @example
 * ```typescript
 * // Merge with multiple sources going to the same input
 * merge(mergeNode, {
 *   input0: fanIn(sourceA, sourceB),  // both sources -> input 0
 *   input1: sourceC
 * })
 *
 * // SIB outputs both going to same merge input
 * const sib = splitInBatches(sibNode, { done: null, each: null });
 * merge(mergeNode, {
 *   input0: fanIn(sib.done(), sib.each()),  // both SIB outputs -> input 0
 *   input1: otherSource
 * })
 * ```
 */
export function fanIn(...sources: NodeInstance<string, string, unknown>[]): FanInSources {
	return {
		_isFanIn: true,
		sources,
	};
}

/**
 * Type guard to check if a value is a FanInSources marker
 */
export function isFanIn(value: unknown): value is FanInSources {
	return (
		value !== null &&
		typeof value === 'object' &&
		'_isFanIn' in value &&
		(value as FanInSources)._isFanIn === true
	);
}
