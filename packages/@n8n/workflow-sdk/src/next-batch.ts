import type { NodeInstance, SplitInBatchesBuilder } from './types/base';

/**
 * Marker interface for loop-back to split in batches node.
 * Extends NodeInstance so it can be used directly with .then()
 */
export interface NextBatchMarker
	extends NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown> {
	readonly _isNextBatch: true;
}

/**
 * Create a loop-back connection to a split in batches node.
 *
 * This is a semantic helper that makes the intent explicit in generated code.
 * It returns the SIB node so it can be chained directly with `.then()`.
 *
 * @param sib - The split in batches node or builder to loop back to
 * @returns The SIB node instance for use with .then()
 *
 * @example
 * ```typescript
 * const sibNode = node({
 *   type: 'n8n-nodes-base.splitInBatches',
 *   version: 3,
 *   config: { parameters: { batchSize: 10 } }
 * });
 *
 * // Using nextBatch() for explicit loop-back (recommended for clarity)
 * workflow
 *   .add(trigger)
 *   .then(
 *     splitInBatches(sibNode)
 *       .onEachBatch(processNode.then(nextBatch(sibNode)))
 *       .onDone(summaryNode)
 *   );
 *
 * // Alternative: direct connection (equivalent but less clear)
 * workflow
 *   .add(trigger)
 *   .then(
 *     splitInBatches(sibNode)
 *       .onEachBatch(processNode.then(sibNode))
 *       .onDone(summaryNode)
 *   );
 * ```
 */
export function nextBatch(
	sib:
		| NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>
		| SplitInBatchesBuilder<unknown>,
): NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown> {
	// Extract the node instance from the builder if needed
	// This allows passing either the builder or the node directly
	return 'sibNode' in sib ? sib.sibNode : sib;
}

/**
 * Type guard to check if a value is a NextBatchMarker
 * Note: Since nextBatch() returns the actual node, this is mainly for
 * documentation purposes and code generation.
 */
export function isNextBatch(value: unknown): value is NextBatchMarker {
	return (
		value !== null &&
		typeof value === 'object' &&
		'_isNextBatch' in value &&
		(value as NextBatchMarker)._isNextBatch === true
	);
}
