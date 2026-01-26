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
 * // Merge with multiple sources going to the same input using .input(n) syntax
 * sourceA.then(mergeNode.input(0))
 * sourceB.then(mergeNode.input(0))  // fanIn: both sources -> input 0
 * sourceC.then(mergeNode.input(1))
 *
 * // Or with fanIn() helper for explicit grouping
 * fanIn(sourceA, sourceB).forEach(src => src.then(mergeNode.input(0)))
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
