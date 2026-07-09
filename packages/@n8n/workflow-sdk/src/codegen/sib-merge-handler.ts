/**
 * SIB Merge Handler
 *
 * Handles the pattern where SplitInBatches (SIB) connects both its done and loop
 * outputs to the same Merge node. This requires explicit connection handling.
 */

import type { BuildContext } from './composite-handlers/build-utils';
import { isMergeType } from './composite-handlers/build-utils';
import type { ExplicitConnectionsNode, ExplicitConnection } from './composite-tree';
import type { SemanticNode } from './types';

/**
 * Pattern info for SIB→Merge connections
 */
export interface SibMergePattern {
	/** The SIB node */
	sibNode: SemanticNode;
	/** The Merge node */
	mergeNode: SemanticNode;
	/** Connections: which SIB output goes to which merge input */
	connections: Array<{
		sibOutput: string; // 'done' or 'loop'
		sibOutputIndex: number; // 0 or 1
		mergeInputSlot: string; // 'branch0', 'branch1', etc.
		mergeInputIndex: number; // 0, 1, etc.
	}>;
	/** Merge output connections (where merge connects to) */
	mergeOutputs: Array<{ target: string; inputSlot: string; inputIndex: number }>;
}

/**
 * Detect if SplitInBatches outputs go to the same merge node at different input indices.
 * This is Pattern 9/10 from the fixture - SIB.done→Merge:branch0, SIB.loop→Merge:branch1
 *
 * Returns info about the explicit connections needed, or null if not this pattern.
 */
export function detectSibMergePattern(
	sibNode: SemanticNode,
	ctx: BuildContext,
): SibMergePattern | null {
	const doneTargets = sibNode.outputs.get('done') ?? [];
	const loopTargets = sibNode.outputs.get('loop') ?? [];

	// Find all merge nodes that SIB outputs connect to
	const mergeConnections = new Map<
		string,
		Array<{
			sibOutput: string;
			sibOutputIndex: number;
			mergeInputSlot: string;
		}>
	>();

	for (const conn of doneTargets) {
		const targetNode = ctx.graph.nodes.get(conn.target);
		if (targetNode && isMergeType(targetNode.type)) {
			const existing = mergeConnections.get(conn.target) ?? [];
			existing.push({
				sibOutput: 'done',
				sibOutputIndex: 0,
				mergeInputSlot: conn.targetInputSlot,
			});
			mergeConnections.set(conn.target, existing);
		}
	}

	for (const conn of loopTargets) {
		const targetNode = ctx.graph.nodes.get(conn.target);
		if (targetNode && isMergeType(targetNode.type)) {
			const existing = mergeConnections.get(conn.target) ?? [];
			existing.push({
				sibOutput: 'loop',
				sibOutputIndex: 1,
				mergeInputSlot: conn.targetInputSlot,
			});
			mergeConnections.set(conn.target, existing);
		}
	}

	// Check if any merge has BOTH done and loop connections from this SIB
	for (const [mergeName, conns] of mergeConnections) {
		const hasDone = conns.some((c) => c.sibOutput === 'done');
		const hasLoop = conns.some((c) => c.sibOutput === 'loop');

		if (hasDone && hasLoop) {
			// Found the pattern! Both SIB outputs go to the same merge
			const mergeNode = ctx.graph.nodes.get(mergeName);
			if (!mergeNode) continue;

			// Parse input indices from slot names (branch0 → 0, branch1 → 1)
			const connections = conns.map((c) => ({
				sibOutput: c.sibOutput,
				sibOutputIndex: c.sibOutputIndex,
				mergeInputSlot: c.mergeInputSlot,
				mergeInputIndex: parseInt(c.mergeInputSlot.replace('branch', ''), 10) || 0,
			}));

			// Get merge output connections
			const mergeOutputTargets = mergeNode.outputs.get('output') ?? [];
			const mergeOutputs = mergeOutputTargets.map((t) => ({
				target: t.target,
				inputSlot: t.targetInputSlot,
				inputIndex: parseInt(t.targetInputSlot.replace('input', ''), 10) || 0,
			}));

			return {
				sibNode,
				mergeNode,
				connections,
				mergeOutputs,
			};
		}
	}

	return null;
}

/**
 * Build an explicit connections node for SIB→merge patterns
 */
export function buildSibMergeExplicitConnections(
	pattern: SibMergePattern,
	ctx: BuildContext,
): ExplicitConnectionsNode {
	const nodes: SemanticNode[] = [pattern.sibNode, pattern.mergeNode];
	const connections: ExplicitConnection[] = [];

	// Register both nodes as variables
	ctx.variables.set(pattern.sibNode.name, pattern.sibNode);
	ctx.variables.set(pattern.mergeNode.name, pattern.mergeNode);
	ctx.visited.add(pattern.sibNode.name);
	ctx.visited.add(pattern.mergeNode.name);

	// Add SIB → Merge connections
	for (const conn of pattern.connections) {
		connections.push({
			sourceNode: pattern.sibNode.name,
			sourceOutput: conn.sibOutputIndex,
			targetNode: pattern.mergeNode.name,
			targetInput: conn.mergeInputIndex,
		});
	}

	// Add Merge → target connections
	for (const output of pattern.mergeOutputs) {
		connections.push({
			sourceNode: pattern.mergeNode.name,
			sourceOutput: 0, // Merge has single output
			targetNode: output.target,
			targetInput: output.inputIndex,
		});

		// If merge output goes back to SIB (loop pattern), don't add SIB again
		// It's already in the nodes array
	}

	return {
		kind: 'explicitConnections',
		nodes,
		connections,
	};
}
