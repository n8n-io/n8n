/**
 * Graph Annotator
 *
 * Analyzes a semantic graph and adds annotations:
 * - isCycleTarget: Node is the target of a back-edge (loop)
 * - isConvergencePoint: Node is reachable from multiple branches
 */

import type { SemanticGraph } from './types';

/**
 * Detect cycles in the graph using DFS and mark cycle targets
 *
 * @param graph - The semantic graph to analyze
 */
function detectCycles(graph: SemanticGraph): void {
	const visiting = new Set<string>(); // Nodes in current DFS path
	const visited = new Set<string>(); // Fully processed nodes

	function dfs(nodeName: string, ancestors: Set<string>): void {
		if (visited.has(nodeName)) return;
		if (visiting.has(nodeName)) return; // Already in current path, will be detected by caller

		visiting.add(nodeName);
		const newAncestors = new Set(ancestors);
		newAncestors.add(nodeName);

		const node = graph.nodes.get(nodeName);
		if (!node) {
			visiting.delete(nodeName);
			visited.add(nodeName);
			return;
		}

		// Check all outgoing connections
		for (const [, connections] of node.outputs) {
			for (const conn of connections) {
				// If target is an ancestor, we found a cycle
				if (ancestors.has(conn.target)) {
					// Mark target as cycle target
					const targetNode = graph.nodes.get(conn.target);
					if (targetNode) {
						targetNode.annotations.isCycleTarget = true;
					}

					// Record the cycle edge
					const edges = graph.cycleEdges.get(nodeName) ?? [];
					edges.push(conn.target);
					graph.cycleEdges.set(nodeName, edges);
				} else if (!visited.has(conn.target)) {
					// Continue DFS
					dfs(conn.target, newAncestors);
				}
			}
		}

		visiting.delete(nodeName);
		visited.add(nodeName);
	}

	// Start DFS from all root nodes
	for (const rootName of graph.roots) {
		const ancestors = new Set<string>();
		dfs(rootName, ancestors);
	}

	// Also check for disconnected components (orphan nodes not in roots)
	for (const [nodeName] of graph.nodes) {
		if (!visited.has(nodeName)) {
			const ancestors = new Set<string>();
			dfs(nodeName, ancestors);
		}
	}
}

/**
 * Collect all nodes reachable from a starting node
 */
function collectReachable(
	startName: string,
	graph: SemanticGraph,
	visited: Set<string> = new Set(),
): Set<string> {
	if (visited.has(startName)) return visited;
	visited.add(startName);

	const node = graph.nodes.get(startName);
	if (!node) return visited;

	for (const [, connections] of node.outputs) {
		for (const conn of connections) {
			collectReachable(conn.target, graph, visited);
		}
	}

	return visited;
}

/**
 * Find convergence nodes - nodes reachable from multiple branches of branching nodes
 *
 * @param graph - The semantic graph to analyze
 */
function findConvergenceNodes(graph: SemanticGraph): void {
	// Look for branching nodes (IF, Switch - nodes with multiple semantic outputs)
	for (const [, node] of graph.nodes) {
		// Skip if not a branching node (has <= 1 output)
		if (node.outputs.size <= 1) continue;

		// Get all outputs and filter to non-empty ones
		const branchOutputs: string[][] = [];
		for (const [, connections] of node.outputs) {
			if (connections.length > 0) {
				const branchTargets = connections.map((c) => c.target);
				branchOutputs.push(branchTargets);
			}
		}

		// Need at least 2 branches to have convergence
		if (branchOutputs.length < 2) continue;

		// Collect reachable nodes from each branch
		const branchReachable: Array<Set<string>> = [];
		for (const branchTargets of branchOutputs) {
			const reachable = new Set<string>();
			for (const target of branchTargets) {
				collectReachable(target, graph, reachable);
			}
			branchReachable.push(reachable);
		}

		// Find nodes reachable from 2+ branches
		const allReachable = new Set<string>();
		for (const reachable of branchReachable) {
			for (const nodeName of reachable) {
				allReachable.add(nodeName);
			}
		}

		for (const nodeName of allReachable) {
			const reachedByCount = branchReachable.filter((set) => set.has(nodeName)).length;
			if (reachedByCount >= 2) {
				const targetNode = graph.nodes.get(nodeName);
				if (targetNode) {
					targetNode.annotations.isConvergencePoint = true;
				}
			}
		}
	}
}

/**
 * Annotate a semantic graph with cycle and convergence information
 *
 * @param graph - The semantic graph to annotate (modified in place)
 */
export function annotateGraph(graph: SemanticGraph): void {
	// Phase 1: Detect cycles
	detectCycles(graph);

	// Phase 2: Find convergence points
	findConvergenceNodes(graph);
}
