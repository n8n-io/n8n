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
 * Add a single subnode to the graph with an AI connection to parentName.
 * If the subnode already exists, merges the connection. Recursively processes
 * any nested subnodes.
 */
function addSingleSubnode(
	nodes: Map<string, GraphNode>,
	subnode: NodeInstance<string, string, unknown>,
	connectionType: string,
	index: number,
	parentName: string,
): void {
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
			{ node: parentName, type: connectionType, index },
		]);
		return;
	}

	// New subnode - add it with its connection
	const subnodeConns = new Map<string, Map<number, ConnectionTarget[]>>();
	subnodeConns.set('main', new Map());
	const aiConnMap = new Map<number, ConnectionTarget[]>();
	aiConnMap.set(0, [{ node: parentName, type: connectionType, index }]);
	subnodeConns.set(connectionType, aiConnMap);
	nodes.set(subnodeName, {
		instance: subnode,
		connections: subnodeConns,
	});

	// Recursively process any nested subnodes
	const nestedSubnodes = subnode.config?.subnodes;
	if (nestedSubnodes) {
		processSubnodes(nodes, subnodeName, nestedSubnodes);
	}
}

/**
 * Add a subnode or array of subnodes, preserving array index semantics.
 * For ai_languageModel: nested array [[m1, m2]] means all at same slot;
 * flat array [m1, m2] means sequential indices (0, 1, ...).
 */
function addSubnodeOrArray(
	nodes: Map<string, GraphNode>,
	subnodeOrArray:
		| NodeInstance<string, string, unknown>
		| Array<NodeInstance<string, string, unknown>>
		| Array<Array<NodeInstance<string, string, unknown>>>
		| undefined,
	connectionType: string,
	parentName: string,
): void {
	if (!subnodeOrArray) return;
	if (Array.isArray(subnodeOrArray)) {
		// Detect nested array: [[m1, m2]] — all items at same slot
		if (subnodeOrArray.length > 0 && Array.isArray(subnodeOrArray[0])) {
			const slots = subnodeOrArray as Array<Array<NodeInstance<string, string, unknown>>>;
			for (let slotIdx = 0; slotIdx < slots.length; slotIdx++) {
				for (const sub of slots[slotIdx]) {
					addSingleSubnode(nodes, sub, connectionType, slotIdx, parentName);
				}
			}
		} else {
			// Flat array: [m1, m2] — sequential indices
			const items = subnodeOrArray as Array<NodeInstance<string, string, unknown>>;
			for (let i = 0; i < items.length; i++) {
				addSingleSubnode(nodes, items[i], connectionType, i, parentName);
			}
		}
	} else {
		addSingleSubnode(nodes, subnodeOrArray, connectionType, 0, parentName);
	}
}

/**
 * Add a subnode or array of subnodes, all targeting index 0 (single-input types).
 */
function addSubnodeFlat(
	nodes: Map<string, GraphNode>,
	subnodeOrArray:
		| NodeInstance<string, string, unknown>
		| Array<NodeInstance<string, string, unknown>>
		| undefined,
	connectionType: string,
	parentName: string,
): void {
	if (!subnodeOrArray) return;
	const items = Array.isArray(subnodeOrArray) ? subnodeOrArray : [subnodeOrArray];
	for (const sub of items) {
		addSingleSubnode(nodes, sub, connectionType, 0, parentName);
	}
}

/**
 * Process all subnode types for a given parent node name.
 */
function processSubnodes(
	nodes: Map<string, GraphNode>,
	parentName: string,
	subnodes: SubnodeConfig,
): void {
	// For ai_languageModel, array index matters (primary=0, fallback=1)
	// Nested array [[m1, m2]] means all at same slot (index = outer array position)
	// Flat array [m1, m2] means sequential indices (0, 1, ...)
	addSubnodeOrArray(nodes, subnodes.model, 'ai_languageModel', parentName);
	if (subnodes.memory) addSingleSubnode(nodes, subnodes.memory, 'ai_memory', 0, parentName);
	if (subnodes.tools) {
		for (const tool of subnodes.tools) {
			addSingleSubnode(nodes, tool, 'ai_tool', 0, parentName);
		}
	}
	if (subnodes.outputParser)
		addSingleSubnode(nodes, subnodes.outputParser, 'ai_outputParser', 0, parentName);
	addSubnodeFlat(nodes, subnodes.embedding ?? subnodes.embeddings, 'ai_embedding', parentName);
	if (subnodes.vectorStore)
		addSingleSubnode(nodes, subnodes.vectorStore, 'ai_vectorStore', 0, parentName);
	if (subnodes.retriever)
		addSingleSubnode(nodes, subnodes.retriever, 'ai_retriever', 0, parentName);
	addSubnodeFlat(nodes, subnodes.documentLoader, 'ai_document', parentName);
	if (subnodes.textSplitter)
		addSingleSubnode(nodes, subnodes.textSplitter, 'ai_textSplitter', 0, parentName);
	addSubnodeFlat(nodes, subnodes.reranker, 'ai_reranker', parentName);
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

	processSubnodes(nodes, mapKey, subnodes);

	return mapKey;
}
