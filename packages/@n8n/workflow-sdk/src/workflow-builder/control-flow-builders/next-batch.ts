import type { NodeInstance, SplitInBatchesBuilder } from '../../types/base';

/**
 * Create a loop-back connection to a split in batches node.
 *
 * This is a semantic helper that makes the intent explicit in generated code.
 * It returns the SIB node so it can be chained directly with `.to()`.
 *
 * @param sib - The split in batches node or builder to loop back to
 * @returns The SIB node instance for use with .to()
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
 *   .to(
 *     splitInBatches(sibNode)
 *       .onEachBatch(processNode.to(nextBatch(sibNode)))
 *       .onDone(summaryNode)
 *   );
 *
 * // Alternative: direct connection (equivalent but less clear)
 * workflow
 *   .add(trigger)
 *   .to(
 *     splitInBatches(sibNode)
 *       .onEachBatch(processNode.to(sibNode))
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
