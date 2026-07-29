/**
 * Deferred Connections
 *
 * Helpers for managing deferred connections to multi-input nodes like Merge.
 * Deferred connections are expressed at root level with .input(n) syntax
 * rather than nested inside branch handlers.
 */

import {
	type DeferredInputConnection,
	type DeferredMergeDownstream,
	extractInputIndex,
} from './composite-handlers/build-utils';
import type { CompositeNode } from './composite-tree';
import type { SemanticNode } from './types';

// Re-export types for consumers
export type {
	DeferredInputConnection,
	DeferredMergeDownstream,
} from './composite-handlers/build-utils';

/**
 * Context type that includes deferred connections
 */
interface DeferredConnectionContext {
	deferredConnections: DeferredInputConnection[];
	deferredMergeDownstreams: DeferredMergeDownstream[];
	deferredMergeNodes: Set<string>;
}

/**
 * Parameters for creating a deferred connection
 */
export interface DeferredConnectionParams {
	targetNode: SemanticNode;
	targetInputIndex: number;
	sourceNodeName: string;
	sourceOutputIndex: number;
}

/**
 * Create a deferred connection and add it to the context.
 *
 * @param params - The connection parameters
 * @param ctx - Context with deferred connections array
 */
export function createDeferredConnection(
	params: DeferredConnectionParams,
	ctx: DeferredConnectionContext,
): void {
	ctx.deferredConnections.push({
		targetNode: params.targetNode,
		targetInputIndex: params.targetInputIndex,
		sourceNodeName: params.sourceNodeName,
		sourceOutputIndex: params.sourceOutputIndex,
	});
}

/**
 * Find which input index of a merge node a given source connects to.
 *
 * @param mergeNode - The merge node to check
 * @param sourceName - The name of the source node
 * @param sourceOutputSlot - Optional output slot to match (for multi-output nodes)
 * @returns The input index (0 if not found)
 */
export function findMergeInputIndex(
	mergeNode: SemanticNode,
	sourceName: string,
	sourceOutputSlot?: string,
): number {
	for (const [inputSlot, sources] of mergeNode.inputSources) {
		for (const source of sources) {
			if (source.from === sourceName) {
				// If sourceOutputSlot is provided, also match on outputSlot
				// This is important for multi-output nodes like Switch where
				// different outputs may connect to different merge inputs
				if (sourceOutputSlot !== undefined) {
					if (source.outputSlot === sourceOutputSlot) {
						return extractInputIndex(inputSlot);
					}
				} else {
					return extractInputIndex(inputSlot);
				}
			}
		}
	}
	return 0; // Default to input 0
}

/**
 * Register a merge node for deferred connection handling.
 *
 * @param mergeNode - The merge node to register
 * @param ctx - Context with deferred merge nodes set
 */
export function registerDeferredMerge(
	mergeNode: SemanticNode,
	ctx: DeferredConnectionContext,
): void {
	ctx.deferredMergeNodes.add(mergeNode.name);
}

/**
 * Check if a merge node is already registered for deferred handling.
 *
 * @param mergeName - The name of the merge node
 * @param ctx - Context with deferred merge nodes set
 * @returns True if the merge is registered for deferred handling
 */
export function isDeferredMerge(mergeName: string, ctx: DeferredConnectionContext): boolean {
	return ctx.deferredMergeNodes.has(mergeName);
}

/**
 * Add a downstream chain for a merge node.
 *
 * @param mergeNode - The merge node
 * @param downstreamChain - The downstream chain to add
 * @param ctx - Context with deferred merge downstreams array
 */
export function addDeferredMergeDownstream(
	mergeNode: SemanticNode,
	downstreamChain: CompositeNode | null,
	ctx: DeferredConnectionContext,
): void {
	ctx.deferredMergeDownstreams.push({
		mergeNode,
		downstreamChain,
	});
}
