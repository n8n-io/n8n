/**
 * Output Utilities
 *
 * Utility functions for working with node outputs in the composite builder.
 * These functions help analyze multi-output nodes like classifiers.
 */

import { getOutputIndex } from './composite-handlers/build-utils';
import type { SemanticNode } from './types';

/**
 * Target info for multi-output nodes including the target input slot
 */
export interface OutputTargetInfo {
	targetName: string;
	targetInputSlot: string;
}

/**
 * Get all output connection targets from ALL output slots.
 * This is needed for nodes with multiple independent output slots (like classifiers).
 * Excludes error outputs (handled separately via .onError())
 */
export function getAllOutputTargets(node: SemanticNode): string[] {
	const targets: string[] = [];
	for (const [outputName, connections] of node.outputs) {
		if (outputName === 'error') continue; // Skip error output
		for (const conn of connections) {
			if (!targets.includes(conn.target)) {
				targets.push(conn.target);
			}
		}
	}
	return targets;
}

/**
 * Check if a node has multiple output slots (not just multiple targets on one slot).
 * Excludes error outputs (handled separately via .onError())
 */
export function hasMultipleOutputSlots(node: SemanticNode): boolean {
	let nonEmptySlots = 0;
	for (const [outputName, connections] of node.outputs) {
		if (outputName === 'error') continue; // Skip error output
		if (connections.length > 0) {
			nonEmptySlots++;
		}
	}
	return nonEmptySlots > 1;
}

/**
 * Check if a node's non-empty output slots have consecutive indices.
 * This helps distinguish true multi-output nodes (like classifiers where each output
 * is a category) from nodes with semantic outputs (like compareDatasets where outputs
 * 0 and 2 mean "same" and "different" but output 1 is unused).
 *
 * Returns true if outputs are consecutive (e.g., 0,1,2 or 1,2,3), not sparse (e.g., 0,2).
 * Outputs don't need to start from 0 - a Switch with empty case 0 but filled cases 1,2
 * should still preserve indices.
 */
export function hasConsecutiveOutputSlots(node: SemanticNode): boolean {
	const occupiedIndices: number[] = [];
	for (const [outputName, connections] of node.outputs) {
		if (outputName === 'error') continue;
		if (connections.length > 0) {
			const index = getOutputIndex(outputName);
			occupiedIndices.push(index);
		}
	}

	if (occupiedIndices.length <= 1) return true; // Single or no outputs are trivially consecutive

	// Sort indices and check if they're consecutive
	occupiedIndices.sort((a, b) => a - b);

	// Check consecutive (each index should be previous + 1)
	for (let i = 1; i < occupiedIndices.length; i++) {
		if (occupiedIndices[i] !== occupiedIndices[i - 1] + 1) {
			return false;
		}
	}
	return true;
}

/**
 * Get output targets grouped by output index for multi-output nodes.
 * Returns a Map from output index to array of target info (name + input slot).
 * Excludes error outputs (handled separately via .onError())
 */
export function getOutputTargetsByIndex(node: SemanticNode): Map<number, OutputTargetInfo[]> {
	const result = new Map<number, OutputTargetInfo[]>();
	for (const [outputName, connections] of node.outputs) {
		if (outputName === 'error') continue; // Skip error output
		if (connections.length === 0) continue;

		const outputIndex = getOutputIndex(outputName);
		const targets = connections.map((c) => ({
			targetName: c.target,
			targetInputSlot: c.targetInputSlot,
		}));
		result.set(outputIndex, targets);
	}
	return result;
}
