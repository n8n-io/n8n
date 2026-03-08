/**
 * Build Utilities
 *
 * Shared utilities for composite handlers and the main composite builder.
 */

import { isStickyNoteType, isMergeNodeType, isSwitchNodeType } from '../../constants/node-types';
import type {
	CompositeNode,
	LeafNode,
	VariableReference,
	DeferredInputConnection,
	DeferredMergeDownstream,
} from '../composite-tree';
import type { SemanticGraph, SemanticNode } from '../types';
import { toVarName } from '../variable-names';

// Re-export for consumers
export { toVarName } from '../variable-names';
export type { DeferredInputConnection, DeferredMergeDownstream } from '../composite-tree';

/**
 * Context for building composites
 */
export interface BuildContext {
	graph: SemanticGraph;
	visited: Set<string>;
	variables: Map<string, SemanticNode>;
	/** Are we currently inside an IF/Switch branch? */
	isBranchContext: boolean;
	/** Connections to express at root level with .input(n) syntax */
	deferredConnections: DeferredInputConnection[];
	/** Merge nodes whose downstreams need separate generation */
	deferredMergeDownstreams: DeferredMergeDownstream[];
	/** Merge nodes that have been deferred (to avoid building downstream multiple times) */
	deferredMergeNodes: Set<string>;
}

/**
 * Create a leaf node
 */
export function createLeaf(node: SemanticNode, errorHandler?: CompositeNode): LeafNode {
	const leaf: LeafNode = { kind: 'leaf', node };
	if (errorHandler) {
		leaf.errorHandler = errorHandler;
	}
	return leaf;
}

/**
 * Create a variable reference
 */
export function createVarRef(nodeName: string): VariableReference {
	return {
		kind: 'varRef',
		varName: toVarName(nodeName),
		nodeName,
	};
}

/**
 * Check if node should be a variable.
 * Sticky notes are excluded since they have no connections.
 */
export function shouldBeVariable(node: SemanticNode): boolean {
	if (isStickyNoteType(node.type)) {
		return false;
	}
	return true;
}

/**
 * Check if a node is a merge node
 */
export function isMergeType(type: string): boolean {
	return isMergeNodeType(type);
}

/**
 * Check if a node is a switch node
 */
export function isSwitchType(type: string): boolean {
	return isSwitchNodeType(type);
}

/**
 * Extract input index from input slot name (e.g., "branch0" → 0, "input2" → 2)
 */
export function extractInputIndex(slotName: string): number {
	const match = slotName.match(/(\d+)$/);
	return match ? parseInt(match[1], 10) : 0;
}

/**
 * Extract output index from semantic output name (e.g., 'output0' → 0, 'output1' → 1)
 */
export function getOutputIndex(outputName: string): number {
	const match = outputName.match(/^output(\d+)$/);
	if (match) {
		return parseInt(match[1], 10);
	}
	return 0;
}

/**
 * Convert output index to semantic output slot name.
 * For Switch nodes, uses 'caseN' format; for regular nodes, uses 'outputN' format.
 */
export function getOutputSlotName(outputIndex: number, isSwitch = false): string {
	return isSwitch ? `case${outputIndex}` : `output${outputIndex}`;
}

/**
 * Get all output connection targets from the first output slot
 * Excludes error outputs (handled separately via .onError())
 */
export function getAllFirstOutputTargets(node: SemanticNode): string[] {
	for (const [outputName, connections] of node.outputs) {
		if (outputName === 'error') continue;
		if (connections.length > 0) {
			return connections.map((c) => c.target);
		}
	}
	return [];
}

/**
 * Check if a node has error output (onError: 'continueErrorOutput')
 */
export function hasErrorOutput(node: SemanticNode): boolean {
	return node.json.onError === 'continueErrorOutput';
}

/**
 * Get error output targets from a node
 */
export function getErrorOutputTargets(node: SemanticNode): string[] {
	const errorConnections = node.outputs.get('error');
	if (!errorConnections || errorConnections.length === 0) {
		return [];
	}
	return errorConnections.map((c) => c.target);
}
