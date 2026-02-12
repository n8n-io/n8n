/**
 * Layout Utility Functions
 *
 * Functions for calculating node positions in workflow layouts.
 */

import { NODE_SPACING_X, DEFAULT_Y, START_X } from './constants';
import type { GraphNode } from '../types/base';

/**
 * Calculate positions for nodes using BFS left-to-right layout.
 * Only sets positions for nodes without explicit config.position.
 *
 * @param nodes Map of node names to GraphNode objects
 * @returns Map of node names to [x, y] positions
 */
export function calculateNodePositions(
	nodes: ReadonlyMap<string, GraphNode>,
): Map<string, [number, number]> {
	const positions = new Map<string, [number, number]>();

	// Find root nodes (nodes with no incoming connections)
	const hasIncoming = new Set<string>();
	for (const graphNode of nodes.values()) {
		for (const typeConns of graphNode.connections.values()) {
			for (const targets of typeConns.values()) {
				for (const target of targets) {
					hasIncoming.add(target.node);
				}
			}
		}
	}

	const rootNodes = [...nodes.keys()].filter((name) => !hasIncoming.has(name));

	// BFS to assign positions
	const visited = new Set<string>();
	const queue: Array<{ name: string; x: number; y: number }> = [];

	// Initialize queue with root nodes
	let y = DEFAULT_Y;
	for (const rootName of rootNodes) {
		queue.push({ name: rootName, x: START_X, y });
		y += 150; // Offset Y for multiple roots
	}

	while (queue.length > 0) {
		const { name, x, y: nodeY } = queue.shift()!;

		if (visited.has(name)) continue;
		visited.add(name);

		// Only set position if node doesn't have explicit position
		const node = nodes.get(name);
		if (node && !node.instance.config?.position) {
			positions.set(name, [x, nodeY]);
		}

		// Queue connected nodes
		if (node) {
			let branchOffset = 0;
			for (const typeConns of node.connections.values()) {
				for (const targets of typeConns.values()) {
					for (const target of targets) {
						if (!visited.has(target.node)) {
							queue.push({
								name: target.node,
								x: x + NODE_SPACING_X,
								y: nodeY + branchOffset * 150,
							});
							branchOffset++;
						}
					}
				}
			}
		}
	}

	return positions;
}
