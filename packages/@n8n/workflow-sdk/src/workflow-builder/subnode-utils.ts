/**
 * Subnode Utilities
 *
 * Functions for adding nodes with their AI subnodes to the graph.
 */

import type { GraphNode, NodeInstance, ConnectionTarget, SubnodeConfig } from '../types/base';

/**
 * Resolve a subnode's effective name. Factory-created subnodes have a top-level `.name`,
 * but plain objects (inline subnode definitions) may only have `.config.name`.
 */
function resolveSubnodeName(subnode: NodeInstance<string, string, unknown>): string | undefined {
	return subnode.name || subnode.config?.name;
}

/**
 * Generate a unique node name if the name already exists in the map.
 */
function generateUniqueName(nodes: Map<string, GraphNode>, baseName: string): string {
	if (!nodes.has(baseName)) {
		return baseName;
	}

	let counter = 1;
	let newName = `${baseName} ${counter}`;
	while (nodes.has(newName)) {
		counter++;
		newName = `${baseName} ${counter}`;
	}
	return newName;
}

/**
 * Process subnodes recursively for a parent node.
 * Adds nested subnodes to the graph with their AI connections.
 */
function processSubnodesRecursively(
	nodes: Map<string, GraphNode>,
	parentNode: NodeInstance<string, string, unknown>,
	subnodes: SubnodeConfig,
): void {
	const addNestedSubnode = (
		subnode: NodeInstance<string, string, unknown>,
		connectionType: string,
	) => {
		const subnodeName = resolveSubnodeName(subnode);
		if (!subnodeName) return;

		const existingSubnode = nodes.get(subnodeName);

		if (existingSubnode) {
			// Subnode already exists - merge the new AI connection
			let existingAiConns = existingSubnode.connections.get(connectionType);
			if (!existingAiConns) {
				existingAiConns = new Map();
				existingSubnode.connections.set(connectionType, existingAiConns);
			}
			const existingOutputConns = existingAiConns.get(0) ?? [];
			existingAiConns.set(0, [
				...existingOutputConns,
				{ node: parentNode.name, type: connectionType, index: 0 },
			]);
			return;
		}

		// New subnode - add it with its connection
		const subnodeConns = new Map<string, Map<number, ConnectionTarget[]>>();
		subnodeConns.set('main', new Map());
		const aiConnMap = new Map<number, ConnectionTarget[]>();
		aiConnMap.set(0, [{ node: parentNode.name, type: connectionType, index: 0 }]);
		subnodeConns.set(connectionType, aiConnMap);
		nodes.set(subnodeName, {
			instance: subnode,
			connections: subnodeConns,
		});

		// Recursively process any nested subnodes
		const nestedSubnodes = subnode.config?.subnodes;
		if (nestedSubnodes) {
			processSubnodesRecursively(nodes, subnode, nestedSubnodes);
		}
	};

	const addNestedSubnodeOrArray = (
		subnodeOrArray:
			| NodeInstance<string, string, unknown>
			| Array<NodeInstance<string, string, unknown>>
			| undefined,
		connectionType: string,
	) => {
		if (!subnodeOrArray) return;
		if (Array.isArray(subnodeOrArray)) {
			for (const subnode of subnodeOrArray) {
				addNestedSubnode(subnode, connectionType);
			}
		} else {
			addNestedSubnode(subnodeOrArray, connectionType);
		}
	};

	// Process all subnode types
	addNestedSubnodeOrArray(subnodes.model, 'ai_languageModel');
	if (subnodes.memory) addNestedSubnode(subnodes.memory, 'ai_memory');
	if (subnodes.tools) {
		for (const tool of subnodes.tools) {
			addNestedSubnode(tool, 'ai_tool');
		}
	}
	if (subnodes.outputParser) addNestedSubnode(subnodes.outputParser, 'ai_outputParser');
	addNestedSubnodeOrArray(subnodes.embedding ?? subnodes.embeddings, 'ai_embedding');
	if (subnodes.vectorStore) addNestedSubnode(subnodes.vectorStore, 'ai_vectorStore');
	if (subnodes.retriever) addNestedSubnode(subnodes.retriever, 'ai_retriever');
	addNestedSubnodeOrArray(subnodes.documentLoader, 'ai_document');
	if (subnodes.textSplitter) addNestedSubnode(subnodes.textSplitter, 'ai_textSplitter');
	if (subnodes.reranker) addNestedSubnode(subnodes.reranker, 'ai_reranker');
}

/**
 * Add a node and its subnodes to the nodes map, creating AI connections.
 * Returns the actual map key used (may differ from nodeInstance.name if renamed),
 * or undefined if the node was skipped (invalid or duplicate reference).
 */
export function addNodeWithSubnodes(
	nodes: Map<string, GraphNode>,
	nodeInstance: NodeInstance<string, string, unknown>,
): string | undefined {
	// Guard against invalid node instances
	if (!nodeInstance || typeof nodeInstance !== 'object') {
		return undefined;
	}
	if (!nodeInstance.type || !nodeInstance.name) {
		return undefined;
	}

	// Check if this exact instance is already in the map under any key
	for (const [key, graphNode] of nodes) {
		if (graphNode.instance === nodeInstance) {
			return key;
		}
	}

	// Determine the actual map key (may be renamed for duplicate names)
	let mapKey = nodeInstance.name;
	const existingNode = nodes.get(nodeInstance.name);
	if (existingNode) {
		if (existingNode.instance === nodeInstance) {
			return undefined;
		}
		// Different node instance with same name - generate unique name
		mapKey = generateUniqueName(nodes, nodeInstance.name);
	}

	// Add the main node
	const connectionsMap = new Map<string, Map<number, ConnectionTarget[]>>();
	connectionsMap.set('main', new Map());
	nodes.set(mapKey, {
		instance: nodeInstance,
		connections: connectionsMap,
	});

	// Process subnodes if present
	const subnodes = nodeInstance.config?.subnodes;
	if (!subnodes) return mapKey;

	// Helper to add a subnode with its AI connection.
	// Uses mapKey (the resolved name) for connection targets, not nodeInstance.name.
	const addSubnode = (subnode: NodeInstance<string, string, unknown>, connectionType: string) => {
		const subnodeName = resolveSubnodeName(subnode);
		if (!subnodeName) return;

		const existingSubnode = nodes.get(subnodeName);

		if (existingSubnode) {
			// Subnode already exists - merge the new AI connection
			let existingAiConns = existingSubnode.connections.get(connectionType);
			if (!existingAiConns) {
				existingAiConns = new Map();
				existingSubnode.connections.set(connectionType, existingAiConns);
			}
			const existingOutputConns = existingAiConns.get(0) ?? [];
			existingAiConns.set(0, [
				...existingOutputConns,
				{ node: mapKey, type: connectionType, index: 0 },
			]);
			return;
		}

		// New subnode - add it with its connection
		const subnodeConns = new Map<string, Map<number, ConnectionTarget[]>>();
		subnodeConns.set('main', new Map());
		const aiConnMap = new Map<number, ConnectionTarget[]>();
		aiConnMap.set(0, [{ node: mapKey, type: connectionType, index: 0 }]);
		subnodeConns.set(connectionType, aiConnMap);
		nodes.set(subnodeName, {
			instance: subnode,
			connections: subnodeConns,
		});

		// Recursively process nested subnodes
		const nestedSubnodes = subnode.config?.subnodes;
		if (nestedSubnodes) {
			processSubnodesRecursively(nodes, subnode, nestedSubnodes);
		}
	};

	const addSubnodeOrArray = (
		subnodeOrArray:
			| NodeInstance<string, string, unknown>
			| Array<NodeInstance<string, string, unknown>>
			| undefined,
		connectionType: string,
	) => {
		if (!subnodeOrArray) return;
		if (Array.isArray(subnodeOrArray)) {
			for (const subnode of subnodeOrArray) {
				addSubnode(subnode, connectionType);
			}
		} else {
			addSubnode(subnodeOrArray, connectionType);
		}
	};

	// Add all subnode types
	addSubnodeOrArray(subnodes.model, 'ai_languageModel');
	if (subnodes.memory) addSubnode(subnodes.memory, 'ai_memory');
	if (subnodes.tools) {
		for (const tool of subnodes.tools) {
			addSubnode(tool, 'ai_tool');
		}
	}
	if (subnodes.outputParser) addSubnode(subnodes.outputParser, 'ai_outputParser');
	addSubnodeOrArray(subnodes.embedding ?? subnodes.embeddings, 'ai_embedding');
	if (subnodes.vectorStore) addSubnode(subnodes.vectorStore, 'ai_vectorStore');
	if (subnodes.retriever) addSubnode(subnodes.retriever, 'ai_retriever');
	addSubnodeOrArray(subnodes.documentLoader, 'ai_document');
	if (subnodes.textSplitter) addSubnode(subnodes.textSplitter, 'ai_textSplitter');
	if (subnodes.reranker) addSubnode(subnodes.reranker, 'ai_reranker');

	return mapKey;
}
