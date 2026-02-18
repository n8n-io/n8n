/**
 * Branch Handler Utilities
 *
 * Shared helper functions for if-else-handler.ts and switch-case-handler.ts.
 * These utilities handle common operations on branch targets like:
 * - Extracting node names from various target types
 * - Collecting nodes for pin data
 * - Adding branch nodes to the graph
 * - Processing branches for both Composite and Builder patterns
 */

import type {
	ConnectionTarget,
	NodeInstance,
	IfElseComposite,
	SwitchCaseComposite,
} from '../../../types/base';
import { isNodeChain } from '../../../types/base';
import { isIfElseBuilder, isSwitchCaseBuilder } from '../../node-builders/node-builder';
import {
	isIfElseComposite,
	isSwitchCaseComposite,
	isSplitInBatchesBuilder,
	extractSplitInBatchesBuilder,
} from '../../type-guards';
import type { MutablePluginContext } from '../types';

/**
 * Get the head node ID from a target (which could be a node, chain, or composite).
 * Mirrors getTargetNodeName but returns .id instead of .name.
 */
export function getTargetNodeId(target: unknown): string | undefined {
	if (target === null || target === undefined) return undefined;

	if (isNodeChain(target)) {
		return target.head.id;
	}

	if (isIfElseComposite(target)) {
		return (target as IfElseComposite).ifNode.id;
	}

	if (isSwitchCaseComposite(target)) {
		return (target as SwitchCaseComposite).switchNode.id;
	}

	if (isIfElseBuilder(target)) {
		return target.ifNode.id;
	}

	if (isSwitchCaseBuilder(target)) {
		return target.switchNode.id;
	}

	if (isSplitInBatchesBuilder(target)) {
		const builder = extractSplitInBatchesBuilder(target);
		return builder.sibNode.id;
	}

	if (typeof (target as NodeInstance<string, string, unknown>).id === 'string') {
		return (target as NodeInstance<string, string, unknown>).id;
	}

	return undefined;
}

/**
 * Get the head node name from a target (which could be a node, chain, or composite).
 * This is used to compute connection target names BEFORE adding nodes.
 */
export function getTargetNodeName(target: unknown): string | undefined {
	if (target === null || target === undefined) return undefined;

	// Handle NodeChain
	if (isNodeChain(target)) {
		return target.head.name;
	}

	// Handle composites
	if (isIfElseComposite(target)) {
		return (target as IfElseComposite).ifNode.name;
	}

	if (isSwitchCaseComposite(target)) {
		return (target as SwitchCaseComposite).switchNode.name;
	}

	// Handle IfElseBuilder (fluent API)
	if (isIfElseBuilder(target)) {
		return target.ifNode.name;
	}

	// Handle SwitchCaseBuilder (fluent API)
	if (isSwitchCaseBuilder(target)) {
		return target.switchNode.name;
	}

	// Handle SplitInBatchesBuilder (including EachChain/DoneChain)
	if (isSplitInBatchesBuilder(target)) {
		const builder = extractSplitInBatchesBuilder(target);
		return builder.sibNode.name;
	}

	// Regular NodeInstance
	if (typeof (target as NodeInstance<string, string, unknown>).name === 'string') {
		return (target as NodeInstance<string, string, unknown>).name;
	}

	return undefined;
}

/**
 * Helper to collect nodes from a branch target for pin data gathering.
 * Handles null, single nodes, and arrays.
 */
export function collectFromTarget(
	target: unknown,
	collector: (node: NodeInstance<string, string, unknown>) => void,
): void {
	if (target === null || target === undefined) return;
	if (Array.isArray(target)) {
		for (const n of target) {
			if (n !== null && n !== undefined) {
				collector(n as NodeInstance<string, string, unknown>);
			}
		}
	} else {
		collector(target as NodeInstance<string, string, unknown>);
	}
}

/**
 * Add nodes from a branch target to the nodes map, recursively handling nested composites.
 * This is used for Builder patterns to add branch nodes AFTER setting up control node connections.
 */
export function addBranchTargetNodes(target: unknown, ctx: MutablePluginContext): void {
	if (target === null || target === undefined) return;

	// Handle array (fan-out) - process each target
	if (Array.isArray(target)) {
		for (const t of target) {
			addBranchTargetNodes(t, ctx);
		}
		return;
	}

	// Add the branch using the context's addBranchToGraph method
	ctx.addBranchToGraph(target);
}

/**
 * Helper to process a branch for Composite patterns (add nodes first, then use results for connections).
 * Used by IfElseComposite and SwitchCaseComposite.
 */
export function processBranchForComposite(
	branch: unknown,
	outputIndex: number,
	ctx: MutablePluginContext,
	mainConns: Map<number, ConnectionTarget[]>,
): void {
	if (branch === null || branch === undefined) {
		return; // Skip null branches - no connection for this output
	}

	// Check if branch is an array (fan-out pattern)
	if (Array.isArray(branch)) {
		// Fan-out: multiple parallel targets from this branch
		const targets: ConnectionTarget[] = [];
		for (const branchNode of branch as Array<NodeInstance<string, string, unknown> | null>) {
			if (branchNode === null) continue;
			const branchHead = ctx.addBranchToGraph(branchNode);
			targets.push({ node: branchHead, type: 'main', index: 0 });
		}
		if (targets.length > 0) {
			mainConns.set(outputIndex, targets);
		}
	} else {
		const branchHead = ctx.addBranchToGraph(branch);
		mainConns.set(outputIndex, [{ node: branchHead, type: 'main', index: 0 }]);
	}
}

/**
 * Process a branch for Builder patterns - compute target names BEFORE adding nodes.
 * Used by IfElseBuilder and SwitchCaseBuilder.
 *
 * @param targetNodeIds Optional map to collect node IDs for each output index,
 *   used later by fixupBranchConnectionTargets to correct stale names after dedup.
 */
export function processBranchForBuilder(
	branch: unknown,
	outputIndex: number,
	mainConns: Map<number, ConnectionTarget[]>,
	targetNodeIds?: Map<number, string[]>,
): void {
	if (branch === null || branch === undefined) {
		return;
	}

	if (Array.isArray(branch)) {
		const targets: ConnectionTarget[] = [];
		const ids: string[] = [];
		for (const t of branch) {
			const targetName = getTargetNodeName(t);
			if (targetName) {
				targets.push({ node: targetName, type: 'main', index: 0 });
				const id = getTargetNodeId(t);
				if (id) ids.push(id);
			}
		}
		if (targets.length > 0) {
			mainConns.set(outputIndex, targets);
			if (targetNodeIds && ids.length > 0) {
				targetNodeIds.set(outputIndex, ids);
			}
		}
	} else {
		const targetName = getTargetNodeName(branch);
		if (targetName) {
			mainConns.set(outputIndex, [{ node: targetName, type: 'main', index: 0 }]);
			const id = getTargetNodeId(branch);
			if (targetNodeIds && id) {
				targetNodeIds.set(outputIndex, [id]);
			}
		}
	}
}

/**
 * Fix stale connection targets after dedup renames.
 *
 * When processBranchForBuilder() runs, it captures target names BEFORE nodes are
 * added to the graph. If a node gets renamed during dedup (e.g. "Process" → "Process 1"),
 * the connection targets still point to the original name. This function updates them
 * using the nameMapping (nodeId → actualMapKey).
 */
export function fixupBranchConnectionTargets(
	mainConns: Map<number, ConnectionTarget[]>,
	targetNodeIds: Map<number, string[]>,
	nameMapping: Map<string, string>,
): void {
	if (nameMapping.size === 0) return;

	for (const [outputIndex, ids] of targetNodeIds) {
		const targets = mainConns.get(outputIndex);
		if (!targets) continue;

		for (let i = 0; i < ids.length && i < targets.length; i++) {
			const actualName = nameMapping.get(ids[i]);
			if (actualName && actualName !== targets[i].node) {
				targets[i].node = actualName;
			}
		}
	}
}
