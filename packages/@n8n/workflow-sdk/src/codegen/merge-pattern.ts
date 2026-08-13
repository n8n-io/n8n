/**
 * Merge Pattern Utilities
 *
 * Functions for detecting and handling merge node patterns in composite building.
 * These utilities help identify when multiple branches converge at a merge node.
 */

import type { BuildContext } from './composite-handlers/build-utils';
import {
	isMergeType,
	extractInputIndex,
	getAllFirstOutputTargets,
} from './composite-handlers/build-utils';
import type { SemanticNode } from './types';

/**
 * Check if a node has outputs going to destinations OTHER than the specified merge node.
 * This is crucial for detecting when a node cannot be safely inlined in a merge composite
 * because it has other outputs that need to be processed separately.
 *
 * Example: Switch → Merge (output 0), Merge1 (output 1), docker ps (output 2)
 * When building Merge, we can't inline Switch because it also connects to Merge1 and docker ps.
 */
export function hasOutputsOutsideMerge(node: SemanticNode, mergeNode: SemanticNode): boolean {
	// Get all target node names that feed INTO this merge
	const mergeInputSources = new Set<string>();
	for (const [, sources] of mergeNode.inputSources) {
		for (const source of sources) {
			mergeInputSources.add(source.from);
		}
	}

	// Check if any of the node's outputs go to destinations NOT in the merge's input sources
	// AND that destination is NOT the merge itself
	for (const [outputName, connections] of node.outputs) {
		if (outputName === 'error') continue; // Skip error output
		for (const conn of connections) {
			// If target is NOT the merge AND target is NOT feeding into this merge as another branch
			if (conn.target !== mergeNode.name && !mergeInputSources.has(conn.target)) {
				return true;
			}
		}
	}
	return false;
}

/**
 * Find a direct Merge node among fan-out targets.
 * Returns the merge node and non-merge targets if one target IS a Merge
 * and other targets feed INTO that same Merge.
 */
export function findDirectMergeInFanOut(
	targetNames: string[],
	ctx: BuildContext,
): { mergeNode: SemanticNode; nonMergeTargets: string[] } | null {
	// Find which targets are Merge nodes
	let mergeTarget: SemanticNode | null = null;
	const nonMergeTargets: string[] = [];

	for (const targetName of targetNames) {
		const node = ctx.graph.nodes.get(targetName);
		if (!node) continue;

		if (isMergeType(node.type)) {
			if (mergeTarget !== null) {
				// Multiple merge targets - this pattern doesn't apply
				return null;
			}
			mergeTarget = node;
		} else {
			nonMergeTargets.push(targetName);
		}
	}

	if (!mergeTarget || nonMergeTargets.length === 0) {
		return null;
	}

	// Verify that ALL non-merge targets feed into this merge
	// (checking inputSources of the merge node)
	// If any target doesn't feed into the merge, skip this optimization
	// so that the independent targets are handled correctly via normal fan-out
	const mergeInputSources = new Set<string>();
	for (const [, sources] of mergeTarget.inputSources) {
		for (const source of sources) {
			mergeInputSources.add(source.from);
		}
	}

	// Check that ALL non-merge targets feed into the merge (directly or one hop away)
	const allFeedIntoMerge = nonMergeTargets.every((targetName) => {
		// Direct connection
		if (mergeInputSources.has(targetName)) return true;

		// Check if target's output goes to merge (one hop)
		const targetNode = ctx.graph.nodes.get(targetName);
		if (targetNode) {
			const outputs = getAllFirstOutputTargets(targetNode);
			if (outputs.includes(mergeTarget.name)) return true;
		}
		return false;
	});

	if (!allFeedIntoMerge) {
		// Some targets don't feed into the merge - skip this optimization
		// They will be handled via normal fan-out handling
		return null;
	}

	return { mergeNode: mergeTarget, nonMergeTargets };
}

/**
 * Check if multiple targets all converge at the same merge node
 * Returns null if any target has outputs going to destinations other than the merge
 * (e.g., Switch with multiple output slots going to different destinations)
 */
export function detectMergePattern(
	targetNames: string[],
	ctx: BuildContext,
): { mergeNode: SemanticNode; branches: string[] } | null {
	if (targetNames.length < 2) return null;

	// Find what each target connects to
	const mergeTargets = new Map<string, string[]>();

	for (const targetName of targetNames) {
		const targetNode = ctx.graph.nodes.get(targetName);
		if (!targetNode) continue;

		// Get what this target connects to (first output slot only for merge detection)
		const nextTargets = getAllFirstOutputTargets(targetNode);
		for (const nextTarget of nextTargets) {
			const nextNode = ctx.graph.nodes.get(nextTarget);
			if (nextNode && isMergeType(nextNode.type)) {
				const branches = mergeTargets.get(nextTarget) ?? [];
				branches.push(targetName);
				mergeTargets.set(nextTarget, branches);
			}
		}
	}

	// Check if all targets converge at the same merge
	for (const [mergeName, branches] of mergeTargets) {
		if (branches.length === targetNames.length) {
			const mergeNode = ctx.graph.nodes.get(mergeName);
			if (mergeNode) {
				// IMPORTANT: Check if any branch has outputs going to OTHER destinations
				// If so, we cannot use the merge pattern as those outputs would be lost
				for (const branchName of branches) {
					const branchNode = ctx.graph.nodes.get(branchName);
					if (branchNode && hasOutputsOutsideMerge(branchNode, mergeNode)) {
						// This branch has other outputs - skip merge pattern
						return null;
					}
				}
				return { mergeNode, branches };
			}
		}
	}

	return null;
}

/**
 * Find which merge input index a source node connects to.
 * Optionally matches on source output slot for multi-output nodes like Switch.
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
