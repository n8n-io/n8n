/**
 * Semantic Graph Builder
 *
 * Transforms n8n workflow JSON with index-based connections into a semantic
 * graph where connections use meaningful names instead of indices.
 */

import type { WorkflowJSON, NodeJSON } from '../types/base';
import type { SemanticGraph, SemanticNode, SemanticConnection, AiConnectionType } from './types';
import { AI_CONNECTION_TYPES } from './types';
import { getOutputName, getInputName } from './semantic-registry';

/**
 * Known trigger node types
 */
const TRIGGER_TYPES = new Set([
	'n8n-nodes-base.manualTrigger',
	'n8n-nodes-base.webhook',
	'n8n-nodes-base.cronTrigger',
	'n8n-nodes-base.scheduleTrigger',
	'n8n-nodes-base.emailTrigger',
	'n8n-nodes-base.start', // Legacy trigger
]);

/**
 * Check if a node type is a trigger
 */
function isTriggerType(type: string): boolean {
	// Check known trigger types
	if (TRIGGER_TYPES.has(type)) {
		return true;
	}
	// Check if type name contains "trigger" (case insensitive)
	return type.toLowerCase().includes('trigger');
}

/**
 * Create a SemanticNode from a NodeJSON
 */
function createSemanticNode(nodeJson: NodeJSON): SemanticNode {
	return {
		name: nodeJson.name,
		type: nodeJson.type,
		json: nodeJson,
		outputs: new Map(),
		inputSources: new Map(),
		subnodes: [],
		annotations: {
			isTrigger: isTriggerType(nodeJson.type),
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

		const connections: SemanticConnection[] = targets.map((target) => {
			const targetNode = graph.nodes.get(target.node);
			const inputSlot = targetNode
				? getInputName(targetNode.type, target.index, targetNode.json)
				: `input${target.index}`;

			// Also record the input source on the target node
			if (targetNode) {
				const sources = targetNode.inputSources.get(inputSlot) ?? [];
				sources.push({ from: sourceName, outputSlot: outputName });
				targetNode.inputSources.set(inputSlot, sources);
			}

			return {
				target: target.node,
				targetInputSlot: inputSlot,
			};
		});

		sourceNode.outputs.set(outputName, connections);
	});
}

/**
 * Parse AI subnode connections and add to graph
 */
function parseAiConnections(
	sourceName: string,
	connectionType: AiConnectionType,
	outputs: Array<Array<{ node: string; type: string; index: number }> | null>,
	graph: SemanticGraph,
): void {
	// AI connections go from subnode → parent node
	outputs.forEach((targets) => {
		if (!targets) return;

		targets.forEach((target) => {
			const parentNode = graph.nodes.get(target.node);
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
	// Generate unique names for nodes with undefined names to prevent Map key collisions
	const unnamedCounters = new Map<string, number>();
	for (const nodeJson of json.nodes) {
		let nodeName = nodeJson.name;
		if (nodeName === undefined || nodeName === '') {
			// Generate a unique name based on type, preserving the undefined/empty name in json
			const typeSuffix = nodeJson.type.split('.').pop() ?? 'node';
			const counter = (unnamedCounters.get(typeSuffix) ?? 0) + 1;
			unnamedCounters.set(typeSuffix, counter);
			nodeName = `__unnamed_${typeSuffix}_${counter}__`;
		}
		graph.nodes.set(nodeName, createSemanticNode(nodeJson));
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

	// Phase 3: Identify roots
	graph.roots = identifyRoots(graph);

	return graph;
}
