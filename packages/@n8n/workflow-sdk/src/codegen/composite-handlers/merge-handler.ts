/**
 * Merge Composite Handler
 *
 * Builds VariableReference for a Merge node and creates deferred connections.
 * Merge nodes use deferred connections to express the .input(n) syntax at root level.
 */

import type { VariableReference } from '../composite-tree';
import type { SemanticNode } from '../types';
import { type BuildContext, createVarRef, extractInputIndex, getOutputIndex } from './build-utils';

// Re-export BuildContext for consumers
export type { BuildContext } from './build-utils';

/**
 * Build composite for a Merge node.
 *
 * Always creates deferred connections for each input instead of a MergeCompositeNode.
 * This avoids duplicate key issues and ensures correct output indices when
 * IF/Switch branches connect to merge inputs.
 *
 * @param node - The Merge semantic node
 * @param ctx - Build context
 * @returns VariableReference to the merge node
 */
export function buildMergeComposite(node: SemanticNode, ctx: BuildContext): VariableReference {
	// Register merge node as a variable since it will be referenced via .input(n) syntax
	ctx.variables.set(node.name, node);

	// Track this merge for downstream chain building
	ctx.deferredMergeNodes.add(node.name);

	// Create deferred connections for each input
	for (const [inputSlot, sources] of node.inputSources) {
		const inputIndex = extractInputIndex(inputSlot);

		for (const source of sources) {
			// Ensure source node is registered as a variable so it gets declared
			const sourceNode = ctx.graph.nodes.get(source.from);
			if (sourceNode) {
				ctx.variables.set(source.from, sourceNode);
			}

			ctx.deferredConnections.push({
				sourceNodeName: source.from,
				sourceOutputIndex: getOutputIndex(source.outputSlot),
				targetNode: node,
				targetInputIndex: inputIndex,
			});
		}
	}

	// Return just a variable reference to the merge
	return createVarRef(node.name);
}
