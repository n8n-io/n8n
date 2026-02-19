/**
 * Semantic Graph Builder
 *
 * Transforms n8n workflow JSON with index-based connections into a semantic
 * graph where connections use meaningful names instead of indices.
 */

import { getOutputName, getInputName } from './semantic-registry';
import type { SemanticGraph, SemanticNode, SemanticConnection, AiConnectionType } from './types';
import { AI_CONNECTION_TYPES } from './types';
import type { WorkflowJSON, NodeJSON } from '../types/base';
import { isTriggerNodeType } from '../utils/trigger-detection';

/**
 * Create a SemanticNode from a NodeJSON
 */
function createSemanticNode(nodeJson: NodeJSON): SemanticNode {
	return {
		name: nodeJson.name ?? nodeJson.id, // Use id as fallback for nodes without names
		type: nodeJson.type,
		json: nodeJson,
		outputs: new Map(),
		inputSources: new Map(),
		subnodes: [],
		annotations: {
			isTrigger: isTriggerNodeType(nodeJson.type),
			isCycleTarget: false,
			isConvergencePoint: false,
		},
	};
}

/**
 * Check if a connection type is an AI connection
 */
function isAiConnectionType(connType: string): connType is AiConnectionType {
	return (AI_CONNECTION_TYPES as readonly string[]).includes(connType);
}

/**
 * Parse main connections and add to graph
 * Skips connections to non-existent nodes (dangling connections from malformed workflow data)
 */
function parseMainConnections(
	sourceName: string,
	outputs: Array<Array<{ node: string; type: string; index: number }> | null>,
	graph: SemanticGraph,
): void {
	const sourceNode = graph.nodes.get(sourceName);
	if (!sourceNode) return;

	outputs.forEach((targets, outputIndex) => {
		if (!targets) return;

		const outputName = getOutputName(sourceNode.type, outputIndex, sourceNode.json);

		const connections: SemanticConnection[] = [];

		for (const target of targets) {
			const targetNode = graph.nodes.get(target.node);

			// Skip connections to non-existent nodes (dangling connections in malformed workflows)
			if (!targetNode) {
				continue;
			}

			const inputSlot = getInputName(targetNode.type, target.index, targetNode.json);

			// Record the input source on the target node
			const sources = targetNode.inputSources.get(inputSlot) ?? [];
			sources.push({ from: sourceName, outputSlot: outputName });
			targetNode.inputSources.set(inputSlot, sources);

			connections.push({
				target: target.node,
				targetInputSlot: inputSlot,
			});
		}

		if (connections.length > 0) {
			sourceNode.outputs.set(outputName, connections);
		}
	});
}

/**
 * Find the nearest parent node that accepts an AI connection type.
 * Used when a subnode references a non-existent parent (e.g., renamed node with stale connections).
 * Matches by: accepts the AI connection type, doesn't already have a subnode of that type,
 * and is closest by canvas position.
 */
function findNearestParent(
	sourceNode: SemanticNode,
	connectionType: AiConnectionType,
	graph: SemanticGraph,
): SemanticNode | undefined {
	const sourcePos = sourceNode.json.position;
	if (!sourcePos) return undefined;

	// AI connection types that allow multiple subnodes (array types)
	const multiSubnodeTypes = new Set(['ai_tool']);

	let bestMatch: SemanticNode | undefined;
	let bestDistance = Infinity;

	for (const [, candidate] of graph.nodes) {
		// Only consider agent-like nodes (langchain nodes that accept AI inputs)
		if (!candidate.type.includes('langchain')) continue;
		// Don't match other subnodes
		if (
			candidate.type.includes('lmChat') ||
			candidate.type.includes('memory') ||
			candidate.type.includes('outputParser') ||
			candidate.type.includes('embedding') ||
			candidate.type.includes('vectorStore') ||
			candidate.type.includes('retriever') ||
			candidate.type.includes('textSplitter') ||
			candidate.type.includes('reranker')
		)
			continue;

		// Skip if this candidate already has a subnode of this connection type (unless it's a multi type)
		if (!multiSubnodeTypes.has(connectionType)) {
			const alreadyHasType = candidate.subnodes.some((s) => s.connectionType === connectionType);
			if (alreadyHasType) continue;
		}

		const candidatePos = candidate.json.position;
		if (!candidatePos) continue;

		const dx = sourcePos[0] - candidatePos[0];
		const dy = sourcePos[1] - candidatePos[1];
		const distance = dx * dx + dy * dy;

		if (distance < bestDistance) {
			bestDistance = distance;
			bestMatch = candidate;
		}
	}

	return bestMatch;
}

/**
 * Parse AI subnode connections and add to graph
 * Skips connections from non-existent source nodes (dangling connections from malformed workflow data)
 * When target parent doesn't exist (stale references), tries to find the nearest matching parent
 */
function parseAiConnections(
	sourceName: string,
	connectionType: AiConnectionType,
	outputs: Array<Array<{ node: string; type: string; index: number }> | null>,
	graph: SemanticGraph,
): void {
	// Skip connections from non-existent source nodes
	const sourceNode = graph.nodes.get(sourceName);
	if (!sourceNode) return;

	// AI connections go from subnode → parent node
	outputs.forEach((targets) => {
		if (!targets) return;

		targets.forEach((target) => {
			let parentNode = graph.nodes.get(target.node);

			// If parent doesn't exist (stale reference from renamed node),
			// try to find the nearest matching parent by position and type
			if (!parentNode) {
				parentNode = findNearestParent(sourceNode, connectionType, graph);
			}

			if (parentNode) {
				parentNode.subnodes.push({
					connectionType,
					subnodeName: sourceName,
				});
			}
		});
	});
}

/**
 * Identify root nodes (triggers and orphans)
 * Excludes subnodes - they are part of their parent node's config
 */
function identifyRoots(graph: SemanticGraph): string[] {
	const roots: string[] = [];
	const hasIncomingConnections = new Set<string>();

	// Find all nodes that have incoming connections
	for (const [, node] of graph.nodes) {
		for (const [, connections] of node.outputs) {
			for (const conn of connections) {
				hasIncomingConnections.add(conn.target);
			}
		}
	}

	// Collect all subnode names (they should not be roots)
	const subnodeNames = new Set<string>();
	for (const [, node] of graph.nodes) {
		for (const subnode of node.subnodes) {
			subnodeNames.add(subnode.subnodeName);
		}
	}

	// Roots are triggers OR nodes without incoming connections
	// Exclude subnodes - they're part of their parent's config
	for (const [name, node] of graph.nodes) {
		if (subnodeNames.has(name)) {
			continue; // Skip subnodes
		}
		if (node.annotations.isTrigger || !hasIncomingConnections.has(name)) {
			roots.push(name);
		}
	}

	return roots;
}

/**
 * Mark all nodes reachable from a starting node within a given scope
 */
function markReachable(
	start: string,
	scope: Set<string>,
	graph: SemanticGraph,
	processed: Set<string>,
): void {
	const stack = [start];
	while (stack.length > 0) {
		const current = stack.pop()!;
		if (processed.has(current)) continue;
		processed.add(current);

		const node = graph.nodes.get(current);
		if (!node) continue;

		for (const [, conns] of node.outputs) {
			for (const conn of conns) {
				if (scope.has(conn.target) && !processed.has(conn.target)) {
					stack.push(conn.target);
				}
			}
		}
	}
}

/**
 * Find entry points for disconnected components (nodes unreachable from any root).
 *
 * A disconnected component is a set of nodes not reachable from any trigger.
 * Entry points are nodes within the component that have no incoming connections
 * from OTHER nodes in the component (self-loops don't count as blockers).
 *
 * For pure cycles (all nodes have incoming from within), we pick one arbitrary node.
 */
function findDisconnectedRoots(graph: SemanticGraph): string[] {
	// Collect subnodes (they should not be roots)
	const subnodeNames = new Set<string>();
	for (const [, node] of graph.nodes) {
		for (const subnode of node.subnodes) {
			subnodeNames.add(subnode.subnodeName);
		}
	}

	// Find all nodes reachable from current roots via BFS
	const reachable = new Set<string>();
	const stack = [...graph.roots];

	while (stack.length > 0) {
		const nodeName = stack.pop()!;
		if (reachable.has(nodeName)) continue;
		reachable.add(nodeName);

		const node = graph.nodes.get(nodeName);
		if (!node) continue;

		for (const [, connections] of node.outputs) {
			for (const conn of connections) {
				if (!reachable.has(conn.target)) {
					stack.push(conn.target);
				}
			}
		}
	}

	// Find disconnected nodes (not reachable and not subnodes)
	const disconnected = new Set<string>();
	for (const [name] of graph.nodes) {
		if (!reachable.has(name) && !subnodeNames.has(name)) {
			disconnected.add(name);
		}
	}

	if (disconnected.size === 0) return [];

	// Build incoming map within disconnected set (excluding self-loops)
	const incomingFromDisconnected = new Map<string, Set<string>>();
	for (const name of disconnected) {
		incomingFromDisconnected.set(name, new Set());
	}

	for (const nodeName of disconnected) {
		const node = graph.nodes.get(nodeName);
		if (!node) continue;

		for (const [, connections] of node.outputs) {
			for (const conn of connections) {
				if (disconnected.has(conn.target) && conn.target !== nodeName) {
					incomingFromDisconnected.get(conn.target)!.add(nodeName);
				}
			}
		}
	}

	// Find entry points and handle pure cycles
	const entryPoints: string[] = [];
	const processed = new Set<string>();

	// First pass: nodes with no incoming from disconnected set
	for (const nodeName of disconnected) {
		if (processed.has(nodeName)) continue;
		if (incomingFromDisconnected.get(nodeName)!.size === 0) {
			entryPoints.push(nodeName);
			markReachable(nodeName, disconnected, graph, processed);
		}
	}

	// Second pass: remaining nodes form pure cycles - pick one per cycle
	for (const nodeName of disconnected) {
		if (!processed.has(nodeName)) {
			entryPoints.push(nodeName);
			markReachable(nodeName, disconnected, graph, processed);
		}
	}

	return entryPoints;
}

/**
 * Build a semantic graph from workflow JSON
 *
 * @param json - The workflow JSON
 * @returns A semantic graph with meaningful connection names
 */
export function buildSemanticGraph(json: WorkflowJSON): SemanticGraph {
	const graph: SemanticGraph = {
		nodes: new Map(),
		roots: [],
		cycleEdges: new Map(),
	};

	// Phase 1: Create nodes
	// Generate unique names for nodes with undefined/empty names or duplicate names
	// to prevent Map key collisions
	const unnamedCounters = new Map<string, number>();
	for (const nodeJson of json.nodes) {
		let nodeName = nodeJson.name;
		if (nodeName === undefined || nodeName === '') {
			// Generate a unique name based on type, preserving the undefined/empty name in json
			const typeSuffix = nodeJson.type.split('.').pop() ?? 'node';
			const counter = (unnamedCounters.get(typeSuffix) ?? 0) + 1;
			unnamedCounters.set(typeSuffix, counter);
			nodeName = `__unnamed_${typeSuffix}_${counter}__`;
		} else if (graph.nodes.has(nodeName)) {
			// Duplicate node name — generate a unique key to avoid Map collision.
			// The first instance keeps the original name (connections reference it).
			let uniqueName = nodeName;
			let counter = 2;
			while (graph.nodes.has(uniqueName)) {
				uniqueName = `${nodeName} ${counter}`;
				counter++;
			}
			nodeName = uniqueName;
		}
		const semanticNode = createSemanticNode(nodeJson);
		// Ensure SemanticNode.name matches the unique graph key for variable name generation
		semanticNode.name = nodeName;
		graph.nodes.set(nodeName, semanticNode);
	}

	// Phase 2: Parse connections
	for (const [sourceName, connectionTypes] of Object.entries(json.connections)) {
		for (const [connType, outputs] of Object.entries(connectionTypes)) {
			const typedOutputs = outputs as Array<Array<{
				node: string;
				type: string;
				index: number;
			}> | null>;

			if (connType === 'main') {
				parseMainConnections(sourceName, typedOutputs, graph);
			} else if (isAiConnectionType(connType)) {
				parseAiConnections(sourceName, connType, typedOutputs, graph);
			}
		}
	}

	// Phase 3: Identify roots (triggers + nodes with no incoming connections)
	graph.roots = identifyRoots(graph);

	// Phase 4: Add entry points from disconnected components
	const disconnectedRoots = findDisconnectedRoots(graph);
	graph.roots.push(...disconnectedRoots);

	return graph;
}
