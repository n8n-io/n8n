import type {
	WorkflowBuilder,
	WorkflowBuilderStatic,
	WorkflowSettings,
	WorkflowJSON,
	NodeJSON,
	NodeInstance,
	TriggerInstance,
	MergeComposite,
	IfBranchComposite,
	SwitchCaseComposite,
	ConnectionTarget,
	GraphNode,
	SubnodeConfig,
	IConnections,
	IDataObject,
	NodeChain,
} from './types/base';
import { isNodeChain } from './types/base';

/**
 * Default horizontal spacing between nodes
 */
const NODE_SPACING_X = 200;

/**
 * Default vertical position for nodes
 */
const DEFAULT_Y = 300;

/**
 * Starting X position for first node
 */
const START_X = 100;

/**
 * Parse version string to number
 */
function parseVersion(version: string | undefined): number {
	if (!version) return 1;
	const match = version.match(/v?(\d+(?:\.\d+)?)/);
	return match ? parseFloat(match[1]) : 1;
}

/**
 * Internal workflow builder implementation
 */
class WorkflowBuilderImpl implements WorkflowBuilder {
	readonly id: string;
	readonly name: string;
	private _settings: WorkflowSettings;
	private _nodes: Map<string, GraphNode>;
	private _currentNode: string | null;
	private _currentOutput: number;
	private _pinData?: Record<string, IDataObject[]>;
	private _meta?: { templateId?: string; instanceId?: string; [key: string]: unknown };

	constructor(
		id: string,
		name: string,
		settings: WorkflowSettings = {},
		nodes?: Map<string, GraphNode>,
		currentNode?: string | null,
		pinData?: Record<string, IDataObject[]>,
		meta?: { templateId?: string; instanceId?: string; [key: string]: unknown },
	) {
		this.id = id;
		this.name = name;
		this._settings = { ...settings };
		this._nodes = nodes ? new Map(nodes) : new Map();
		this._currentNode = currentNode ?? null;
		this._currentOutput = 0;
		this._pinData = pinData;
		this._meta = meta;
	}

	private clone(overrides: {
		nodes?: Map<string, GraphNode>;
		currentNode?: string | null;
		currentOutput?: number;
		settings?: WorkflowSettings;
		pinData?: Record<string, IDataObject[]>;
	}): WorkflowBuilderImpl {
		const builder = new WorkflowBuilderImpl(
			this.id,
			this.name,
			overrides.settings ?? this._settings,
			overrides.nodes ?? this._nodes,
			overrides.currentNode !== undefined ? overrides.currentNode : this._currentNode,
			overrides.pinData ?? this._pinData,
			this._meta,
		);
		builder._currentOutput = overrides.currentOutput ?? this._currentOutput;
		return builder;
	}

	/**
	 * Collect pinData from a node and merge it with existing pinData
	 */
	private collectPinData(
		node: NodeInstance<string, string, unknown>,
	): Record<string, IDataObject[]> | undefined {
		const nodePinData = node.config?.pinData;
		if (!nodePinData || nodePinData.length === 0) {
			return this._pinData;
		}

		// Merge with existing pinData
		return {
			...this._pinData,
			[node.name]: nodePinData,
		};
	}

	/**
	 * Collect pinData from all nodes in a chain
	 */
	private collectPinDataFromChain(chain: NodeChain): Record<string, IDataObject[]> | undefined {
		let pinData = this._pinData;
		for (const chainNode of chain.allNodes) {
			// Handle composites that may be in the chain (they don't have a config property)
			if (this.isSwitchCaseComposite(chainNode)) {
				const composite = chainNode as unknown as SwitchCaseComposite;
				pinData = this.collectPinDataFromNode(composite.switchNode, pinData);
				for (const caseNode of composite.cases) {
					pinData = this.collectPinDataFromNode(caseNode, pinData);
				}
			} else if (this.isIfBranchComposite(chainNode)) {
				const composite = chainNode as unknown as IfBranchComposite;
				pinData = this.collectPinDataFromNode(composite.ifNode, pinData);
				pinData = this.collectPinDataFromNode(composite.trueBranch, pinData);
				if (composite.falseBranch) {
					pinData = this.collectPinDataFromNode(composite.falseBranch, pinData);
				}
			} else if (this.isMergeComposite(chainNode)) {
				const composite = chainNode as unknown as MergeComposite;
				pinData = this.collectPinDataFromNode(composite.mergeNode, pinData);
				for (const branch of composite.branches as NodeInstance<string, string, unknown>[]) {
					pinData = this.collectPinDataFromNode(branch, pinData);
				}
			} else {
				// Regular node
				const nodePinData = chainNode.config?.pinData;
				if (nodePinData && nodePinData.length > 0) {
					pinData = {
						...pinData,
						[chainNode.name]: nodePinData,
					};
				}
			}
		}
		return pinData;
	}

	/**
	 * Helper to collect pinData from a single node and merge with existing pinData
	 */
	private collectPinDataFromNode(
		node: NodeInstance<string, string, unknown>,
		existingPinData: Record<string, IDataObject[]> | undefined,
	): Record<string, IDataObject[]> | undefined {
		const nodePinData = node.config?.pinData;
		if (nodePinData && nodePinData.length > 0) {
			return {
				...existingPinData,
				[node.name]: nodePinData,
			};
		}
		return existingPinData;
	}

	add<
		N extends
			| NodeInstance<string, string, unknown>
			| TriggerInstance<string, string, unknown>
			| NodeChain,
	>(node: N): WorkflowBuilder {
		const newNodes = new Map(this._nodes);

		// Check if this is a composite (can be passed directly to add())
		if (this.isSwitchCaseComposite(node)) {
			this.addSwitchCaseNodes(newNodes, node as unknown as SwitchCaseComposite);
			return this.clone({
				nodes: newNodes,
				currentNode: (node as unknown as SwitchCaseComposite).switchNode.name,
				currentOutput: 0,
				pinData: this._pinData,
			});
		}

		if (this.isIfBranchComposite(node)) {
			this.addIfBranchNodes(newNodes, node as unknown as IfBranchComposite);
			return this.clone({
				nodes: newNodes,
				currentNode: (node as unknown as IfBranchComposite).ifNode.name,
				currentOutput: 0,
				pinData: this._pinData,
			});
		}

		if (this.isMergeComposite(node)) {
			this.addMergeNodes(newNodes, node as unknown as MergeComposite);
			return this.clone({
				nodes: newNodes,
				currentNode: (node as unknown as MergeComposite).mergeNode.name,
				currentOutput: 0,
				pinData: this._pinData,
			});
		}

		// Check if this is a NodeChain
		if (isNodeChain(node)) {
			// Add all nodes from the chain, handling composites that may have been chained
			for (const chainNode of node.allNodes) {
				// Check if chainNode is a SwitchCaseComposite (can happen via chain.then(switchCase(...)))
				if (this.isSwitchCaseComposite(chainNode)) {
					this.addSwitchCaseNodes(newNodes, chainNode as unknown as SwitchCaseComposite);
				} else if (this.isIfBranchComposite(chainNode)) {
					this.addIfBranchNodes(newNodes, chainNode as unknown as IfBranchComposite);
				} else if (this.isMergeComposite(chainNode)) {
					this.addMergeNodes(newNodes, chainNode as unknown as MergeComposite);
				} else {
					this.addNodeWithSubnodes(newNodes, chainNode);
				}
			}
			// Also add nodes from connections that aren't in allNodes (e.g., onError handlers)
			this.addConnectionTargetNodes(newNodes, node);
			// Collect pinData from all nodes in the chain
			const chainPinData = this.collectPinDataFromChain(node);
			// Set currentNode to the tail (last node in the chain)
			return this.clone({
				nodes: newNodes,
				currentNode: node.tail.name,
				currentOutput: 0,
				pinData: chainPinData,
			});
		}

		// Regular node or trigger
		this.addNodeWithSubnodes(newNodes, node);

		// Collect pinData from the node if present
		const newPinData = this.collectPinData(node);

		return this.clone({
			nodes: newNodes,
			currentNode: node.name,
			currentOutput: 0,
			pinData: newPinData,
		});
	}

	then<N extends NodeInstance<string, string, unknown>>(
		nodeOrComposite: N | N[] | MergeComposite | IfBranchComposite | SwitchCaseComposite,
	): WorkflowBuilder {
		// Handle array of nodes (fan-out pattern)
		if (Array.isArray(nodeOrComposite)) {
			return this.handleFanOut(nodeOrComposite);
		}

		// Handle merge composite
		if ('mergeNode' in nodeOrComposite && 'branches' in nodeOrComposite) {
			return this.handleMergeComposite(nodeOrComposite as MergeComposite);
		}

		// Handle IF branch composite
		if ('ifNode' in nodeOrComposite && 'trueBranch' in nodeOrComposite) {
			return this.handleIfBranchComposite(nodeOrComposite as IfBranchComposite);
		}

		// Handle Switch case composite
		if ('switchNode' in nodeOrComposite && 'cases' in nodeOrComposite) {
			return this.handleSwitchCaseComposite(nodeOrComposite as SwitchCaseComposite);
		}

		// Handle split in batches builder
		if (this.isSplitInBatchesBuilder(nodeOrComposite)) {
			return this.handleSplitInBatches(nodeOrComposite);
		}

		const node = nodeOrComposite as N;
		const newNodes = new Map(this._nodes);

		// Add the new node and its subnodes
		this.addNodeWithSubnodes(newNodes, node);

		// Connect from current node if exists
		if (this._currentNode) {
			const currentGraphNode = newNodes.get(this._currentNode);
			if (currentGraphNode) {
				const mainConns = currentGraphNode.connections.get('main') || new Map();
				const outputConnections = mainConns.get(this._currentOutput) || [];
				mainConns.set(this._currentOutput, [
					...outputConnections,
					{ node: node.name, type: 'main', index: 0 },
				]);
				currentGraphNode.connections.set('main', mainConns);
			}
		}

		// Collect pinData from the node if present
		const newPinData = this.collectPinData(node);

		return this.clone({
			nodes: newNodes,
			currentNode: node.name,
			currentOutput: 0,
			pinData: newPinData,
		});
	}

	settings(settings: WorkflowSettings): WorkflowBuilder {
		return this.clone({
			settings: { ...this._settings, ...settings },
		});
	}

	getNode(name: string): NodeInstance<string, string, unknown> | undefined {
		// First try direct lookup (for backward compatibility and nodes added via add/then)
		const directLookup = this._nodes.get(name);
		if (directLookup) {
			return directLookup.instance;
		}
		// Otherwise search by instance.name (for nodes loaded via fromJSON)
		for (const graphNode of this._nodes.values()) {
			if (graphNode.instance.name === name) {
				return graphNode.instance;
			}
		}
		return undefined;
	}

	toJSON(): WorkflowJSON {
		const nodes: NodeJSON[] = [];
		const connections: IConnections = {};

		// Calculate positions for nodes without explicit positions
		const nodePositions = this.calculatePositions();

		// Collect connections declared on nodes via .then()
		for (const graphNode of this._nodes.values()) {
			// Only process if the node instance has getConnections() (nodes from builder, not fromJSON)
			if (typeof graphNode.instance.getConnections === 'function') {
				const nodeConns = graphNode.instance.getConnections();
				for (const { target, outputIndex } of nodeConns) {
					// Resolve target node name - handles both NodeInstance and composites
					const targetName = this.resolveTargetNodeName(target);
					if (!targetName) continue;

					const mainConns = graphNode.connections.get('main') || new Map();
					const outputConns = mainConns.get(outputIndex) || [];
					// Avoid duplicates
					const alreadyExists = outputConns.some((c: ConnectionTarget) => c.node === targetName);
					if (!alreadyExists) {
						outputConns.push({ node: targetName, type: 'main', index: 0 });
						mainConns.set(outputIndex, outputConns);
						graphNode.connections.set('main', mainConns);
					}
				}
			}
		}

		// Convert nodes
		for (const [mapKey, graphNode] of this._nodes) {
			const instance = graphNode.instance;
			const config = instance.config ?? {};
			const position = config.position ?? nodePositions.get(mapKey) ?? [START_X, DEFAULT_Y];

			// Use the actual node name from the instance, not the map key
			const n8nNode: NodeJSON = {
				id: instance.id,
				name: instance.name,
				type: instance.type,
				typeVersion: parseVersion(instance.version),
				position,
				// Serialize parameters to convert placeholder() markers to strings
				parameters: config.parameters ? JSON.parse(JSON.stringify(config.parameters)) : undefined,
			};

			// Add optional properties
			if (config.credentials) {
				// Serialize credentials to ensure newCredential() markers are converted to JSON
				n8nNode.credentials = JSON.parse(JSON.stringify(config.credentials));
			}
			if (config.disabled) {
				n8nNode.disabled = config.disabled;
			}
			if (config.notes) {
				n8nNode.notes = config.notes;
			}
			if (config.notesInFlow) {
				n8nNode.notesInFlow = config.notesInFlow;
			}
			if (config.executeOnce) {
				n8nNode.executeOnce = config.executeOnce;
			}
			if (config.retryOnFail) {
				n8nNode.retryOnFail = config.retryOnFail;
			}
			if (config.alwaysOutputData) {
				n8nNode.alwaysOutputData = config.alwaysOutputData;
			}
			if (config.onError) {
				n8nNode.onError = config.onError;
			}

			nodes.push(n8nNode);

			// Convert connections - handle all connection types
			let hasConnections = false;
			for (const typeConns of graphNode.connections.values()) {
				if (typeConns.size > 0) {
					hasConnections = true;
					break;
				}
			}

			if (hasConnections) {
				const nodeConnections: IConnections[string] = {};

				for (const [connType, outputMap] of graphNode.connections) {
					if (outputMap.size === 0) continue;

					// Get max output index to ensure array is properly sized
					const maxOutput = Math.max(...outputMap.keys());
					const outputArray: Array<Array<{ node: string; type: string; index: number }>> = [];

					for (let i = 0; i <= maxOutput; i++) {
						const targets = outputMap.get(i) || [];
						outputArray[i] = targets.map((target) => ({
							node: target.node,
							type: target.type,
							index: target.index,
						}));
					}

					nodeConnections[connType] = outputArray;
				}

				if (Object.keys(nodeConnections).length > 0 && instance.name !== undefined) {
					connections[instance.name] = nodeConnections;
				}
			}
		}

		const json: WorkflowJSON = {
			id: this.id,
			name: this.name,
			nodes,
			connections,
		};

		// Preserve settings even if empty (for round-trip fidelity)
		if (this._settings !== undefined) {
			json.settings = this._settings;
		}

		if (this._pinData && Object.keys(this._pinData).length > 0) {
			json.pinData = this._pinData;
		}

		if (this._meta) {
			json.meta = this._meta;
		}

		return json;
	}

	toString(): string {
		return JSON.stringify(this.toJSON(), null, 2);
	}

	/**
	 * Check if value is a SplitInBatchesBuilder or a chain (DoneChain/EachChain) from one
	 */
	private isSplitInBatchesBuilder(value: unknown): boolean {
		if (value === null || typeof value !== 'object') return false;

		// Direct builder check
		if ('sibNode' in value && '_doneNodes' in value && '_eachNodes' in value) {
			return true;
		}

		// Check if it's a DoneChain or EachChain with a _parent that's a builder
		if ('_parent' in value && '_nodes' in value) {
			const parent = (value as { _parent: unknown })._parent;
			return (
				parent !== null &&
				typeof parent === 'object' &&
				'sibNode' in parent &&
				'_doneNodes' in parent &&
				'_eachNodes' in parent
			);
		}

		return false;
	}

	/**
	 * Extract the SplitInBatchesBuilder from a value (handles both direct builder and chains)
	 */
	private extractSplitInBatchesBuilder(value: unknown): {
		sibNode: NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>;
		_doneNodes: NodeInstance<string, string, unknown>[];
		_eachNodes: NodeInstance<string, string, unknown>[];
		_hasLoop: boolean;
	} {
		// Direct builder
		if ('sibNode' in (value as object)) {
			return value as {
				sibNode: NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>;
				_doneNodes: NodeInstance<string, string, unknown>[];
				_eachNodes: NodeInstance<string, string, unknown>[];
				_hasLoop: boolean;
			};
		}

		// Chain with _parent - extract the parent builder
		const chain = value as { _parent: unknown };
		return chain._parent as {
			sibNode: NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>;
			_doneNodes: NodeInstance<string, string, unknown>[];
			_eachNodes: NodeInstance<string, string, unknown>[];
			_hasLoop: boolean;
		};
	}

	/**
	 * Check if value is a SwitchCaseComposite
	 */
	private isSwitchCaseComposite(value: unknown): boolean {
		if (value === null || typeof value !== 'object') return false;
		return 'switchNode' in value && 'cases' in value;
	}

	/**
	 * Resolve the target node name from a connection target.
	 * Handles both NodeInstance and composites (SwitchCaseComposite, IfBranchComposite, MergeComposite).
	 */
	private resolveTargetNodeName(target: unknown): string | undefined {
		if (target === null || typeof target !== 'object') return undefined;

		// Check for SwitchCaseComposite
		if (this.isSwitchCaseComposite(target)) {
			return (target as SwitchCaseComposite).switchNode.name;
		}

		// Check for IfBranchComposite
		if (this.isIfBranchComposite(target)) {
			return (target as IfBranchComposite).ifNode.name;
		}

		// Check for MergeComposite
		if (this.isMergeComposite(target)) {
			return (target as MergeComposite).mergeNode.name;
		}

		// Regular NodeInstance
		return (target as NodeInstance<string, string, unknown>).name;
	}

	/**
	 * Check if value is an IfBranchComposite
	 */
	private isIfBranchComposite(value: unknown): boolean {
		if (value === null || typeof value !== 'object') return false;
		return 'ifNode' in value && 'trueBranch' in value;
	}

	/**
	 * Check if value is a MergeComposite
	 */
	private isMergeComposite(value: unknown): boolean {
		if (value === null || typeof value !== 'object') return false;
		return 'mergeNode' in value && 'branches' in value;
	}

	/**
	 * Add target nodes from a chain's connections that aren't already in the nodes map.
	 * This handles nodes added via .onError() which aren't included in the chain's allNodes.
	 */
	private addConnectionTargetNodes(nodes: Map<string, GraphNode>, chain: NodeChain): void {
		const connections = chain.getConnections();
		for (const { target } of connections) {
			// Skip if target is a composite (already handled elsewhere)
			if (this.isSwitchCaseComposite(target)) continue;
			if (this.isIfBranchComposite(target)) continue;
			if (this.isMergeComposite(target)) continue;

			// Add the target node if not already in the map
			const targetNode = target as NodeInstance<string, string, unknown>;
			if (!nodes.has(targetNode.name)) {
				this.addNodeWithSubnodes(nodes, targetNode);
			}
		}
	}

	/**
	 * Add nodes from a SwitchCaseComposite to the nodes map
	 */
	private addSwitchCaseNodes(nodes: Map<string, GraphNode>, composite: SwitchCaseComposite): void {
		// Build the switch node connections to its cases
		const switchMainConns = new Map<number, ConnectionTarget[]>();

		// Add all case nodes and build connections from switch to each case
		// Use addBranchToGraph to handle NodeChain cases (nodes with .then() chains)
		composite.cases.forEach((caseNode, index) => {
			const caseHeadName = this.addBranchToGraph(nodes, caseNode);
			switchMainConns.set(index, [{ node: caseHeadName, type: 'main', index: 0 }]);
		});

		// Add the switch node with connections to cases
		const switchConns = new Map<string, Map<number, ConnectionTarget[]>>();
		switchConns.set('main', switchMainConns);
		nodes.set(composite.switchNode.name, {
			instance: composite.switchNode,
			connections: switchConns,
		});
	}

	/**
	 * Add nodes from an IfBranchComposite to the nodes map
	 */
	private addIfBranchNodes(nodes: Map<string, GraphNode>, composite: IfBranchComposite): void {
		// Build the IF node connections to its branches
		const ifMainConns = new Map<number, ConnectionTarget[]>();

		// Add branch nodes (may be NodeChain or single nodes)
		if (composite.trueBranch) {
			const trueBranchHead = this.addBranchToGraph(nodes, composite.trueBranch);
			ifMainConns.set(0, [{ node: trueBranchHead, type: 'main', index: 0 }]);
		}
		if (composite.falseBranch) {
			const falseBranchHead = this.addBranchToGraph(nodes, composite.falseBranch);
			ifMainConns.set(1, [{ node: falseBranchHead, type: 'main', index: 0 }]);
		}

		// Add the IF node with connections to branches
		const ifConns = new Map<string, Map<number, ConnectionTarget[]>>();
		ifConns.set('main', ifMainConns);
		nodes.set(composite.ifNode.name, {
			instance: composite.ifNode,
			connections: ifConns,
		});
	}

	/**
	 * Add nodes from a MergeComposite to the nodes map
	 */
	private addMergeNodes(nodes: Map<string, GraphNode>, composite: MergeComposite): void {
		// Add the merge node first (without connections, branches connect TO it)
		const mergeConns = new Map<string, Map<number, ConnectionTarget[]>>();
		mergeConns.set('main', new Map());
		nodes.set(composite.mergeNode.name, {
			instance: composite.mergeNode,
			connections: mergeConns,
		});

		// Add all branch nodes with connections TO the merge node at different input indices
		const branches = composite.branches as NodeInstance<string, string, unknown>[];
		branches.forEach((branch, index) => {
			const branchMainConns = new Map<number, ConnectionTarget[]>();
			branchMainConns.set(0, [{ node: composite.mergeNode.name, type: 'main', index }]);
			const branchConns = new Map<string, Map<number, ConnectionTarget[]>>();
			branchConns.set('main', branchMainConns);
			nodes.set(branch.name, {
				instance: branch,
				connections: branchConns,
			});
		});
	}

	/**
	 * Add a node and its subnodes to the nodes map, creating AI connections
	 */
	private addNodeWithSubnodes(
		nodes: Map<string, GraphNode>,
		nodeInstance: NodeInstance<string, string, unknown>,
	): void {
		// Add the main node
		const connectionsMap = new Map<string, Map<number, ConnectionTarget[]>>();
		connectionsMap.set('main', new Map());
		nodes.set(nodeInstance.name, {
			instance: nodeInstance,
			connections: connectionsMap,
		});

		// Process subnodes if present
		const subnodes = nodeInstance.config?.subnodes as SubnodeConfig | undefined;
		if (!subnodes) return;

		// Helper to add a subnode with its AI connection (recursively handles nested subnodes)
		const addSubnode = (subnode: NodeInstance<string, string, unknown>, connectionType: string) => {
			const subnodeConns = new Map<string, Map<number, ConnectionTarget[]>>();
			subnodeConns.set('main', new Map());
			// Create AI connection from subnode to parent node
			const aiConnMap = new Map<number, ConnectionTarget[]>();
			aiConnMap.set(0, [{ node: nodeInstance.name, type: connectionType, index: 0 }]);
			subnodeConns.set(connectionType, aiConnMap);
			nodes.set(subnode.name, {
				instance: subnode,
				connections: subnodeConns,
			});

			// Recursively process any nested subnodes this subnode might have
			const nestedSubnodes = subnode.config?.subnodes as SubnodeConfig | undefined;
			if (nestedSubnodes) {
				this.processSubnodesRecursively(nodes, subnode, nestedSubnodes);
			}
		};

		// Helper to add single or array of subnodes
		const addSubnodeOrArray = (
			subnodeOrArray:
				| NodeInstance<string, string, unknown>
				| NodeInstance<string, string, unknown>[]
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

		// Add model subnode(s) - can be array for modelSelector
		addSubnodeOrArray(subnodes.model, 'ai_languageModel');

		// Add memory subnode
		if (subnodes.memory) {
			addSubnode(subnodes.memory, 'ai_memory');
		}

		// Add tool subnodes
		if (subnodes.tools) {
			for (const tool of subnodes.tools) {
				addSubnode(tool, 'ai_tool');
			}
		}

		// Add output parser subnode
		if (subnodes.outputParser) {
			addSubnode(subnodes.outputParser, 'ai_outputParser');
		}

		// Add embedding subnode(s)
		addSubnodeOrArray(subnodes.embedding, 'ai_embedding');

		// Add vector store subnode
		if (subnodes.vectorStore) {
			addSubnode(subnodes.vectorStore, 'ai_vectorStore');
		}

		// Add retriever subnode
		if (subnodes.retriever) {
			addSubnode(subnodes.retriever, 'ai_retriever');
		}

		// Add document loader subnode(s)
		addSubnodeOrArray(subnodes.documentLoader, 'ai_document');

		// Add text splitter subnode
		if (subnodes.textSplitter) {
			addSubnode(subnodes.textSplitter, 'ai_textSplitter');
		}
	}

	/**
	 * Recursively process nested subnodes for a parent node
	 */
	private processSubnodesRecursively(
		nodes: Map<string, GraphNode>,
		parentNode: NodeInstance<string, string, unknown>,
		subnodes: SubnodeConfig,
	): void {
		// Helper to add a nested subnode with its AI connection
		const addNestedSubnode = (
			subnode: NodeInstance<string, string, unknown>,
			connectionType: string,
		) => {
			const subnodeConns = new Map<string, Map<number, ConnectionTarget[]>>();
			subnodeConns.set('main', new Map());
			// Create AI connection from subnode to parent
			const aiConnMap = new Map<number, ConnectionTarget[]>();
			aiConnMap.set(0, [{ node: parentNode.name, type: connectionType, index: 0 }]);
			subnodeConns.set(connectionType, aiConnMap);
			nodes.set(subnode.name, {
				instance: subnode,
				connections: subnodeConns,
			});

			// Recursively process any nested subnodes
			const nestedSubnodes = subnode.config?.subnodes as SubnodeConfig | undefined;
			if (nestedSubnodes) {
				this.processSubnodesRecursively(nodes, subnode, nestedSubnodes);
			}
		};

		// Helper to add single or array of nested subnodes
		const addNestedSubnodeOrArray = (
			subnodeOrArray:
				| NodeInstance<string, string, unknown>
				| NodeInstance<string, string, unknown>[]
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
		addNestedSubnodeOrArray(subnodes.embedding, 'ai_embedding');
		if (subnodes.vectorStore) addNestedSubnode(subnodes.vectorStore, 'ai_vectorStore');
		if (subnodes.retriever) addNestedSubnode(subnodes.retriever, 'ai_retriever');
		addNestedSubnodeOrArray(subnodes.documentLoader, 'ai_document');
		if (subnodes.textSplitter) addNestedSubnode(subnodes.textSplitter, 'ai_textSplitter');
	}

	/**
	 * Handle fan-out pattern - connects current node to multiple target nodes
	 */
	private handleFanOut<N extends NodeInstance<string, string, unknown>>(
		nodes: N[],
	): WorkflowBuilder {
		if (nodes.length === 0) {
			return this;
		}

		const newNodes = new Map(this._nodes);

		// Add all target nodes and connect them to the current node
		for (const node of nodes) {
			// Add the new node and its subnodes
			this.addNodeWithSubnodes(newNodes, node);

			// Connect from current node to this target
			if (this._currentNode) {
				const currentGraphNode = newNodes.get(this._currentNode);
				if (currentGraphNode) {
					const mainConns = currentGraphNode.connections.get('main') || new Map();
					const outputConnections = mainConns.get(this._currentOutput) || [];
					mainConns.set(this._currentOutput, [
						...outputConnections,
						{ node: node.name, type: 'main', index: 0 },
					]);
					currentGraphNode.connections.set('main', mainConns);
				}
			}
		}

		// Set the last node in the array as the current node (for continued chaining)
		const lastNode = nodes[nodes.length - 1];

		return this.clone({
			nodes: newNodes,
			currentNode: lastNode.name,
			currentOutput: 0,
		});
	}

	/**
	 * Handle merge composite - creates parallel branches that merge
	 */
	private handleMergeComposite(mergeComposite: MergeComposite): WorkflowBuilder {
		const newNodes = new Map(this._nodes);
		const branches = mergeComposite.branches as NodeInstance<string, string, unknown>[];

		// Add all branch nodes (with subnodes) with correct input index connections
		branches.forEach((branchNode, branchIndex) => {
			this.addNodeWithSubnodes(newNodes, branchNode);

			// Connect from current node to each branch
			if (this._currentNode) {
				const currentGraphNode = newNodes.get(this._currentNode);
				if (currentGraphNode) {
					const mainConns = currentGraphNode.connections.get('main') || new Map();
					const outputConnections = mainConns.get(this._currentOutput) || [];
					mainConns.set(this._currentOutput, [
						...outputConnections,
						{ node: branchNode.name, type: 'main', index: 0 },
					]);
					currentGraphNode.connections.set('main', mainConns);
				}
			}

			// Connect each branch to the merge node at the correct INPUT INDEX
			const branchGraphNode = newNodes.get(branchNode.name)!;
			const branchMainConns = branchGraphNode.connections.get('main') || new Map();
			branchMainConns.set(0, [
				{ node: mergeComposite.mergeNode.name, type: 'main', index: branchIndex },
			]);
			branchGraphNode.connections.set('main', branchMainConns);
		});

		// Add the merge node
		const mergeConns = new Map<string, Map<number, ConnectionTarget[]>>();
		mergeConns.set('main', new Map());
		newNodes.set(mergeComposite.mergeNode.name, {
			instance: mergeComposite.mergeNode,
			connections: mergeConns,
		});

		return this.clone({
			nodes: newNodes,
			currentNode: mergeComposite.mergeNode.name,
			currentOutput: 0,
		});
	}

	/**
	 * Add a branch to the graph, handling both single nodes and NodeChains.
	 * Returns the name of the first node in the branch (for connection from IF).
	 */
	private addBranchToGraph(
		nodes: Map<string, GraphNode>,
		branch: NodeInstance<string, string, unknown>,
	): string {
		// Check if the branch is a NodeChain
		if (isNodeChain(branch)) {
			// Add all nodes from the chain, handling composites that may have been chained
			for (const chainNode of branch.allNodes) {
				// Check if chainNode is a composite (can happen via chain.then(ifBranch(...)))
				if (this.isSwitchCaseComposite(chainNode)) {
					this.addSwitchCaseNodes(nodes, chainNode as unknown as SwitchCaseComposite);
				} else if (this.isIfBranchComposite(chainNode)) {
					this.addIfBranchNodes(nodes, chainNode as unknown as IfBranchComposite);
				} else if (this.isMergeComposite(chainNode)) {
					this.addMergeNodes(nodes, chainNode as unknown as MergeComposite);
				} else {
					this.addNodeWithSubnodes(nodes, chainNode);
				}
			}

			// Process connections declared on the chain (from .then() calls)
			const connections = branch.getConnections();
			for (const { target, outputIndex } of connections) {
				// Find the source node in the chain that declared this connection
				// by looking for the node whose .then() was called
				for (const chainNode of branch.allNodes) {
					if (typeof chainNode.getConnections === 'function') {
						const nodeConns = chainNode.getConnections();
						if (nodeConns.some((c) => c.target === target && c.outputIndex === outputIndex)) {
							// This chain node declared this connection
							const sourceGraphNode = nodes.get(chainNode.name);
							if (sourceGraphNode) {
								const targetName = this.resolveTargetNodeName(target);
								if (targetName) {
									const mainConns = sourceGraphNode.connections.get('main') || new Map();
									const outputConns = mainConns.get(outputIndex) || [];
									if (!outputConns.some((c: ConnectionTarget) => c.node === targetName)) {
										outputConns.push({ node: targetName, type: 'main', index: 0 });
										mainConns.set(outputIndex, outputConns);
										sourceGraphNode.connections.set('main', mainConns);
									}
								}
							}
						}
					}
				}
			}

			// Return the head node name (first node in the chain)
			return branch.head.name;
		} else {
			// Single node - add it and return its name
			this.addNodeWithSubnodes(nodes, branch);
			return branch.name;
		}
	}

	/**
	 * Handle IF branch composite - creates IF node with true/false branches
	 * Supports null branches for single-branch patterns
	 * Handles NodeChain branches (nodes with .then() chains)
	 */
	private handleIfBranchComposite(composite: IfBranchComposite): WorkflowBuilder {
		const newNodes = new Map(this._nodes);
		const ifMainConns = new Map<number, ConnectionTarget[]>();

		// Add true branch (may be NodeChain with downstream nodes)
		if (composite.trueBranch) {
			const trueBranchHead = this.addBranchToGraph(newNodes, composite.trueBranch);
			ifMainConns.set(0, [{ node: trueBranchHead, type: 'main', index: 0 }]);
		}

		// Add false branch (may be NodeChain with downstream nodes)
		if (composite.falseBranch) {
			const falseBranchHead = this.addBranchToGraph(newNodes, composite.falseBranch);
			ifMainConns.set(1, [{ node: falseBranchHead, type: 'main', index: 0 }]);
		}

		// Add IF node with connections to present branches
		const ifConns = new Map<string, Map<number, ConnectionTarget[]>>();
		ifConns.set('main', ifMainConns);
		newNodes.set(composite.ifNode.name, {
			instance: composite.ifNode,
			connections: ifConns,
		});

		// Connect current node to IF node
		if (this._currentNode) {
			const currentGraphNode = newNodes.get(this._currentNode);
			if (currentGraphNode) {
				const mainConns = currentGraphNode.connections.get('main') || new Map();
				const outputConns = mainConns.get(this._currentOutput) || [];
				outputConns.push({ node: composite.ifNode.name, type: 'main', index: 0 });
				mainConns.set(this._currentOutput, outputConns);
				currentGraphNode.connections.set('main', mainConns);
			}
		}

		// Return with IF node as current (allows chaining after both branches complete)
		return this.clone({
			nodes: newNodes,
			currentNode: composite.ifNode.name,
			currentOutput: 0,
		});
	}

	/**
	 * Handle Switch case composite - creates Switch node with case outputs
	 */
	private handleSwitchCaseComposite(composite: SwitchCaseComposite): WorkflowBuilder {
		const newNodes = new Map(this._nodes);
		const switchConns = new Map<string, Map<number, ConnectionTarget[]>>();
		const mainConns = new Map<number, ConnectionTarget[]>();

		// Add each case node (with subnodes) and connect from switch at correct output index
		// Use addBranchToGraph to handle NodeChain cases (nodes with .then() chains)
		composite.cases.forEach((caseNode, index) => {
			const caseHeadName = this.addBranchToGraph(newNodes, caseNode);
			mainConns.set(index, [{ node: caseHeadName, type: 'main', index: 0 }]);
		});

		// Add Switch node with all case connections
		switchConns.set('main', mainConns);
		newNodes.set(composite.switchNode.name, {
			instance: composite.switchNode,
			connections: switchConns,
		});

		// Connect current node to Switch node
		if (this._currentNode) {
			const currentGraphNode = newNodes.get(this._currentNode);
			if (currentGraphNode) {
				const currMainConns = currentGraphNode.connections.get('main') || new Map();
				const outputConns = currMainConns.get(this._currentOutput) || [];
				outputConns.push({ node: composite.switchNode.name, type: 'main', index: 0 });
				currMainConns.set(this._currentOutput, outputConns);
				currentGraphNode.connections.set('main', currMainConns);
			}
		}

		return this.clone({
			nodes: newNodes,
			currentNode: composite.switchNode.name,
			currentOutput: 0,
		});
	}

	/**
	 * Handle split in batches builder
	 */
	private handleSplitInBatches(sibBuilder: unknown): WorkflowBuilder {
		// Extract builder from direct builder or chain (DoneChain/EachChain)
		const builder = this.extractSplitInBatchesBuilder(sibBuilder);

		const newNodes = new Map(this._nodes);

		// Add the split in batches node
		const sibConns = new Map<string, Map<number, ConnectionTarget[]>>();
		sibConns.set('main', new Map());
		newNodes.set(builder.sibNode.name, {
			instance: builder.sibNode,
			connections: sibConns,
		});

		// Connect from current node to split in batches
		if (this._currentNode) {
			const currentGraphNode = newNodes.get(this._currentNode);
			if (currentGraphNode) {
				const mainConns = currentGraphNode.connections.get('main') || new Map();
				const outputConnections = mainConns.get(this._currentOutput) || [];
				mainConns.set(this._currentOutput, [
					...outputConnections,
					{ node: builder.sibNode.name, type: 'main', index: 0 },
				]);
				currentGraphNode.connections.set('main', mainConns);
			}
		}

		const sibGraphNode = newNodes.get(builder.sibNode.name)!;
		const sibMainConns = sibGraphNode.connections.get('main') || new Map();

		// Add done chain nodes (output 0)
		let prevDoneNode: string | null = null;
		for (const doneNode of builder._doneNodes) {
			const doneConns = new Map<string, Map<number, ConnectionTarget[]>>();
			doneConns.set('main', new Map());
			newNodes.set(doneNode.name, {
				instance: doneNode,
				connections: doneConns,
			});

			if (prevDoneNode === null) {
				// First done node connects to output 0 of split in batches
				const output0 = sibMainConns.get(0) || [];
				sibMainConns.set(0, [...output0, { node: doneNode.name, type: 'main', index: 0 }]);
			} else {
				// Chain subsequent done nodes
				const prevGraphNode = newNodes.get(prevDoneNode)!;
				const prevMainConns = prevGraphNode.connections.get('main') || new Map();
				prevMainConns.set(0, [{ node: doneNode.name, type: 'main', index: 0 }]);
				prevGraphNode.connections.set('main', prevMainConns);
			}
			prevDoneNode = doneNode.name;
		}

		// Add each chain nodes (output 1)
		let prevEachNode: string | null = null;
		for (const eachNode of builder._eachNodes) {
			const eachConns = new Map<string, Map<number, ConnectionTarget[]>>();
			eachConns.set('main', new Map());
			newNodes.set(eachNode.name, {
				instance: eachNode,
				connections: eachConns,
			});

			if (prevEachNode === null) {
				// First each node connects to output 1 of split in batches
				const output1 = sibMainConns.get(1) || [];
				sibMainConns.set(1, [...output1, { node: eachNode.name, type: 'main', index: 0 }]);
			} else {
				// Chain subsequent each nodes
				const prevGraphNode = newNodes.get(prevEachNode)!;
				const prevMainConns = prevGraphNode.connections.get('main') || new Map();
				prevMainConns.set(0, [{ node: eachNode.name, type: 'main', index: 0 }]);
				prevGraphNode.connections.set('main', prevMainConns);
			}
			prevEachNode = eachNode.name;
		}

		sibGraphNode.connections.set('main', sibMainConns);

		// Handle loop - connect last each node back to split in batches
		if (builder._hasLoop && prevEachNode) {
			const lastEachGraphNode = newNodes.get(prevEachNode)!;
			const lastMainConns = lastEachGraphNode.connections.get('main') || new Map();
			lastMainConns.set(0, [{ node: builder.sibNode.name, type: 'main', index: 0 }]);
			lastEachGraphNode.connections.set('main', lastMainConns);
		}

		return this.clone({
			nodes: newNodes,
			currentNode: builder.sibNode.name,
			currentOutput: 0,
		});
	}

	/**
	 * Calculate positions for nodes using a simple left-to-right layout
	 */
	private calculatePositions(): Map<string, [number, number]> {
		const positions = new Map<string, [number, number]>();

		// Find root nodes (nodes with no incoming connections)
		const hasIncoming = new Set<string>();
		for (const graphNode of this._nodes.values()) {
			for (const typeConns of graphNode.connections.values()) {
				for (const targets of typeConns.values()) {
					for (const target of targets) {
						hasIncoming.add(target.node);
					}
				}
			}
		}

		const rootNodes = [...this._nodes.keys()].filter((name) => !hasIncoming.has(name));

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
			const node = this._nodes.get(name);
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
}

/**
 * Create a new workflow builder
 */
function createWorkflow(id: string, name: string, settings?: WorkflowSettings): WorkflowBuilder {
	return new WorkflowBuilderImpl(id, name, settings);
}

/**
 * Import workflow from n8n JSON format
 */
function fromJSON(json: WorkflowJSON): WorkflowBuilder {
	const nodes = new Map<string, GraphNode>();
	// Map from connection name (how nodes reference each other) to map key
	const nameToKey = new Map<string, string>();

	// Create node instances from JSON
	let unnamedCounter = 0;
	for (const n8nNode of json.nodes) {
		const version = `v${n8nNode.typeVersion}`;

		// Convert credentials from n8n format to SDK format
		const credentials = n8nNode.credentials
			? Object.fromEntries(
					Object.entries(n8nNode.credentials).map(([type, cred]) => [
						type,
						{ name: cred.name, id: cred.id ?? '' },
					]),
				)
			: undefined;

		// Create a minimal node instance
		const instance: NodeInstance<string, string, unknown> = {
			type: n8nNode.type,
			version,
			id: n8nNode.id,
			name: n8nNode.name,
			config: {
				name: n8nNode.name, // Include name in config for consistency
				parameters: n8nNode.parameters as IDataObject,
				credentials,
				position: n8nNode.position,
				disabled: n8nNode.disabled,
				notes: n8nNode.notes,
				notesInFlow: n8nNode.notesInFlow,
				executeOnce: n8nNode.executeOnce,
				retryOnFail: n8nNode.retryOnFail,
				alwaysOutputData: n8nNode.alwaysOutputData,
				onError: n8nNode.onError,
			},
			update: function (config) {
				return {
					...this,
					config: { ...this.config, ...config },
				};
			},
			then: function () {
				throw new Error(
					'Nodes from fromJSON() do not support then() - use workflow builder methods',
				);
			},
			onError: function () {
				throw new Error(
					'Nodes from fromJSON() do not support onError() - use workflow builder methods',
				);
			},
			getConnections: function () {
				return [];
			},
		};

		// Initialize connections map with all connection types
		const connectionsMap = new Map<string, Map<number, ConnectionTarget[]>>();

		// Use a unique key for the map (ID if available, otherwise generate one)
		// Connections reference nodes by name, so we also build a name->key mapping
		const mapKey = n8nNode.id || `__unnamed_${unnamedCounter++}`;
		if (n8nNode.name !== undefined) {
			nameToKey.set(n8nNode.name, mapKey);
		}

		nodes.set(mapKey, {
			instance,
			connections: connectionsMap,
		});
	}

	// Rebuild connections - handle all connection types
	if (json.connections) {
		for (const [sourceName, nodeConns] of Object.entries(json.connections)) {
			// Find the node by its name using the nameToKey mapping
			const mapKey = nameToKey.get(sourceName);
			const graphNode = mapKey ? nodes.get(mapKey) : undefined;
			if (!graphNode) continue;

			// Iterate over all connection types (main, ai_tool, ai_memory, etc.)
			for (const [connType, outputs] of Object.entries(nodeConns)) {
				if (!outputs || !Array.isArray(outputs)) continue;

				const typeMap =
					graphNode.connections.get(connType) || new Map<number, ConnectionTarget[]>();

				// Store all outputs including empty ones to preserve array structure
				for (let outputIndex = 0; outputIndex < outputs.length; outputIndex++) {
					const targets = outputs[outputIndex];
					if (targets && targets.length > 0) {
						typeMap.set(
							outputIndex,
							targets.map((conn: { node: string; type: string; index: number }) => ({
								node: conn.node,
								type: conn.type,
								index: conn.index,
							})),
						);
					} else {
						// Store empty array to preserve output index
						typeMap.set(outputIndex, []);
					}
				}

				graphNode.connections.set(connType, typeMap);
			}
		}
	}

	// Find the last node in the chain for currentNode
	let lastNode: string | null = null;
	for (const name of nodes.keys()) {
		lastNode = name;
	}

	return new WorkflowBuilderImpl(
		json.id ?? '',
		json.name,
		json.settings,
		nodes,
		lastNode,
		json.pinData,
		json.meta,
	);
}

/**
 * Workflow builder factory function with static methods
 */
export const workflow: WorkflowBuilderStatic = Object.assign(createWorkflow, {
	fromJSON,
});
