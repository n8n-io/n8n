import type { NodeInstance } from './types/base';

/**
 * Marker interface for fan-out (one source to multiple targets)
 */
export interface FanOutTargets {
	readonly _isFanOut: true;
	readonly targets: NodeInstance<string, string, unknown>[];
}

/**
 * Create a fan-out marker for connecting one output to multiple targets.
 *
 * This is a semantic helper that makes the intent explicit in generated code.
 * It wraps multiple target nodes to indicate they should all receive data
 * from the same output.
 *
 * @param targets - The target nodes that will all receive data from the same source
 * @returns A FanOutTargets marker containing the targets
 *
 * @example
 * ```typescript
 * // Split in batches with done output going to multiple nodes
 * splitInBatches(sibNode)
 *   .onDone(fanOut(nodeA, nodeB))  // done output -> both nodeA and nodeB
 *   .onEachBatch(processNode.then(sibNode))
 *
 * // IF branch with true output going to multiple nodes
 * ifNode
 *   .onTrue(fanOut(nodeA, nodeB, nodeC))  // true -> all three nodes
 *   .onFalse(singleNode)
 * ```
 */
export function fanOut(...targets: NodeInstance<string, string, unknown>[]): FanOutTargets {
	return {
		_isFanOut: true,
		targets,
	};
}

/**
 * Type guard to check if a value is a FanOutTargets marker
 */
export function isFanOut(value: unknown): value is FanOutTargets {
	return (
		value !== null &&
		typeof value === 'object' &&
		'_isFanOut' in value &&
		(value as FanOutTargets)._isFanOut === true
	);
}
