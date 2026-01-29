import type {
	WorkflowBuilder,
	WorkflowBuilderStatic,
	WorkflowSettings,
	WorkflowJSON,
	NodeJSON,
	NodeInstance,
	TriggerInstance,
	MergeComposite,
	IfElseComposite,
	SwitchCaseComposite,
	ConnectionTarget,
	GraphNode,
	SubnodeConfig,
	IConnections,
	IDataObject,
	NodeChain,
	CredentialReference,
	NewCredentialValue,
} from './types/base';
import { isNodeChain } from './types/base';
import { isInputTarget, isIfElseBuilder, isSwitchCaseBuilder } from './node-builder';

/**
 * Type guard to check if a MergeComposite uses the old named input syntax.
 * This is for backward compatibility with code using the old merge(node, { input0: ..., input1: ... }) syntax.
 * New code should use the merge() factory and .input(n) syntax instead.
 */
function isMergeNamedInputSyntax(
	composite: MergeComposite<NodeInstance<string, string, unknown>[]>,
): boolean {
	return '_isNamedInputSyntax' in composite && composite._isNamedInputSyntax === true;
}
import type { IfElseBuilder, SwitchCaseBuilder } from './types/base';
import { isTriggerNodeType } from './utils/trigger-detection';

/**
 * Track SIB builders currently being processed to prevent infinite recursion.
 * This is used when onEachBatch chain loops back to the same SIB builder.
 */
const processingSibBuilders = new WeakSet<object>();

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
 * Check if an object looks like a resource locator value.
 * Resource locators have a 'mode' property (typically 'list', 'id', 'url', or 'name')
 * and a 'value' property.
 */
function isResourceLocatorLike(obj: unknown): obj is Record<string, unknown> {
	if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
		return false;
	}
	const record = obj as Record<string, unknown>;
	// Must have 'mode' property - this is the key identifier
	// Common modes: 'list', 'id', 'url', 'name'
	if (!('mode' in record)) {
		return false;
	}
	// Should have 'value' property as well (the actual selected value)
	if (!('value' in record)) {
		return false;
	}
	return true;
}

/**
 * Recursively normalize resource locator values in parameters.
 * Adds __rl: true to objects that look like resource locator values but are missing it.
 */
function normalizeResourceLocators(params: unknown): unknown {
	if (typeof params !== 'object' || params === null) {
		return params;
	}

	if (Array.isArray(params)) {
		return params.map((item) => normalizeResourceLocators(item));
	}

	const result: Record<string, unknown> = {};
	const record = params as Record<string, unknown>;

	for (const [key, value] of Object.entries(record)) {
		if (isResourceLocatorLike(value)) {
			// Add __rl: true if missing
			result[key] = {
				__rl: true,
				...(normalizeResourceLocators(value) as Record<string, unknown>),
			};
		} else if (typeof value === 'object' && value !== null) {
			// Recursively process nested objects
			result[key] = normalizeResourceLocators(value);
		} else {
			result[key] = value;
		}
	}

	return result;
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
					if (caseNode === null) continue;
					if (Array.isArray(caseNode)) {
						for (const branchNode of caseNode) {
							if (branchNode !== null) {
								pinData = this.collectPinDataFromNode(branchNode, pinData);
							}
						}
					} else {
						pinData = this.collectPinDataFromNode(caseNode, pinData);
					}
				}
			} else if (this.isIfElseComposite(chainNode)) {
				const composite = chainNode as unknown as IfElseComposite;
				pinData = this.collectPinDataFromNode(composite.ifNode, pinData);
				// Handle array branches (fan-out within branch)
				if (composite.trueBranch) {
					if (Array.isArray(composite.trueBranch)) {
						for (const branchNode of composite.trueBranch) {
							pinData = this.collectPinDataFromNode(branchNode, pinData);
						}
					} else {
						pinData = this.collectPinDataFromNode(composite.trueBranch, pinData);
					}
				}
				if (composite.falseBranch) {
					if (Array.isArray(composite.falseBranch)) {
						for (const branchNode of composite.falseBranch) {
							pinData = this.collectPinDataFromNode(branchNode, pinData);
						}
					} else {
						pinData = this.collectPinDataFromNode(composite.falseBranch, pinData);
					}
				}
			} else if (this.isMergeComposite(chainNode)) {
				const composite = chainNode as unknown as MergeComposite<
					NodeInstance<string, string, unknown>[]
				>;
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

		// Handle plain array (fan-out)
		// This adds all targets without creating a primary connection
		if (Array.isArray(node)) {
			for (const target of node) {
				if (isInputTarget(target)) {
					// InputTarget - add the target node
					const inputTargetNode = target.node as NodeInstance<string, string, unknown>;
					if (!newNodes.has(inputTargetNode.name)) {
						this.addNodeWithSubnodes(newNodes, inputTargetNode);
					}
				} else if (isNodeChain(target)) {
					// Chain - add all nodes from the chain
					for (const chainNode of target.allNodes) {
						if (!newNodes.has(chainNode.name)) {
							this.addNodeWithSubnodes(newNodes, chainNode);
						}
					}
					this.addConnectionTargetNodes(newNodes, target);
				} else {
					// Regular node
					const targetNode = target as NodeInstance<string, string, unknown>;
					if (!newNodes.has(targetNode.name)) {
						this.addNodeWithSubnodes(newNodes, targetNode);
					}
				}
			}
			return this.clone({
				nodes: newNodes,
				currentNode: this._currentNode,
				currentOutput: this._currentOutput,
				pinData: this._pinData,
			});
		}

		// Check for fluent API builders FIRST (before composites)
		// IfElseBuilder and SwitchCaseBuilder have similar properties to their composite counterparts
		// so we must check for builders first to avoid incorrect dispatch
		if (isIfElseBuilder(node)) {
			this.addIfElseBuilderNodes(newNodes, node as unknown as IfElseBuilder<unknown>);
			return this.clone({
				nodes: newNodes,
				currentNode: (node as unknown as IfElseBuilder<unknown>).ifNode.name,
				currentOutput: 0,
				pinData: this._pinData,
			});
		}

		if (isSwitchCaseBuilder(node)) {
			this.addSwitchCaseBuilderNodes(newNodes, node as unknown as SwitchCaseBuilder<unknown>);
			return this.clone({
				nodes: newNodes,
				currentNode: (node as unknown as SwitchCaseBuilder<unknown>).switchNode.name,
				currentOutput: 0,
				pinData: this._pinData,
			});
		}

		// Check for composites (old API - can be passed directly to add())
		if (this.isSwitchCaseComposite(node)) {
			this.addSwitchCaseNodes(newNodes, node as unknown as SwitchCaseComposite);
			return this.clone({
				nodes: newNodes,
				currentNode: (node as unknown as SwitchCaseComposite).switchNode.name,
				currentOutput: 0,
				pinData: this._pinData,
			});
		}

		if (this.isIfElseComposite(node)) {
			this.addIfElseNodes(newNodes, node as unknown as IfElseComposite);
			return this.clone({
				nodes: newNodes,
				currentNode: (node as unknown as IfElseComposite).ifNode.name,
				currentOutput: 0,
				pinData: this._pinData,
			});
		}

		if (this.isMergeComposite(node)) {
			this.addMergeNodes(
				newNodes,
				node as unknown as MergeComposite<NodeInstance<string, string, unknown>[]>,
			);
			return this.clone({
				nodes: newNodes,
				currentNode: (node as unknown as MergeComposite<NodeInstance<string, string, unknown>[]>)
					.mergeNode.name,
				currentOutput: 0,
				pinData: this._pinData,
			});
		}

		// Check if this is a SplitInBatchesBuilder (for disconnected splitInBatches roots)
		if (this.isSplitInBatchesBuilder(node)) {
			this.addSplitInBatchesChainNodes(newNodes, node);
			const builder = this.extractSplitInBatchesBuilder(node);
			return this.clone({
				nodes: newNodes,
				currentNode: builder.sibNode.name,
				currentOutput: 0,
				pinData: this._pinData,
			});
		}

		// Check if this is a NodeChain
		if (isNodeChain(node)) {
			// Track node ID -> actual map key for renamed nodes
			const nameMapping = new Map<string, string>();

			// Add all nodes from the chain, handling composites that may have been chained
			for (const chainNode of node.allNodes) {
				// Check for builders FIRST (before composites) - builders have similar properties
				if (isIfElseBuilder(chainNode)) {
					this.addIfElseBuilderNodes(newNodes, chainNode as unknown as IfElseBuilder<unknown>);
				} else if (isSwitchCaseBuilder(chainNode)) {
					this.addSwitchCaseBuilderNodes(
						newNodes,
						chainNode as unknown as SwitchCaseBuilder<unknown>,
					);
				} else if (this.isSwitchCaseComposite(chainNode)) {
					this.addSwitchCaseNodes(newNodes, chainNode as unknown as SwitchCaseComposite);
				} else if (this.isIfElseComposite(chainNode)) {
					this.addIfElseNodes(newNodes, chainNode as unknown as IfElseComposite);
				} else if (this.isMergeComposite(chainNode)) {
					this.addMergeNodes(
						newNodes,
						chainNode as unknown as MergeComposite<NodeInstance<string, string, unknown>[]>,
					);
				} else if (this.isSplitInBatchesBuilder(chainNode)) {
					// Handle SplitInBatchesBuilder nested in chain (via node.then(splitInBatches(...)))
					this.addSplitInBatchesChainNodes(newNodes, chainNode, nameMapping);
				} else {
					const actualKey = this.addNodeWithSubnodes(newNodes, chainNode);
					// Track the actual key if it was renamed
					if (actualKey && actualKey !== chainNode.name) {
						nameMapping.set(chainNode.id, actualKey);
					}
				}
			}
			// Also add nodes from connections that aren't in allNodes (e.g., onError handlers)
			this.addConnectionTargetNodes(newNodes, node, nameMapping);
			// Collect pinData from all nodes in the chain
			const chainPinData = this.collectPinDataFromChain(node);
			// Set currentNode to the tail (last node in the chain)
			// Use nameMapping to get the actual key if the tail was renamed
			const tailKey = nameMapping.get(node.tail.id) ?? node.tail.name;
			return this.clone({
				nodes: newNodes,
				currentNode: tailKey,
				currentOutput: 0,
				pinData: chainPinData,
			});
		}

		// Regular node or trigger
		this.addNodeWithSubnodes(newNodes, node);

		// Also add connection target nodes (e.g., onError handlers)
		// This is important when re-adding a node that already exists but has new connections
		this.addSingleNodeConnectionTargets(newNodes, node);

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
		nodeOrComposite: N | N[] | MergeComposite | IfElseComposite | SwitchCaseComposite | NodeChain,
	): WorkflowBuilder {
		// Handle array of nodes (fan-out pattern)
		if (Array.isArray(nodeOrComposite)) {
			return this.handleFanOut(nodeOrComposite);
		}

		// Handle NodeChain (e.g., node().then().then())
		// This must come before composite checks since chains have composite-like properties
		if (isNodeChain(nodeOrComposite)) {
			return this.handleNodeChain(nodeOrComposite);
		}

		// Handle merge composite
		if ('mergeNode' in nodeOrComposite && 'branches' in nodeOrComposite) {
			return this.handleMergeComposite(
				nodeOrComposite as MergeComposite<NodeInstance<string, string, unknown>[]>,
			);
		}

		// Handle IfElseBuilder (fluent API) - check before IfElseComposite
		if (isIfElseBuilder(nodeOrComposite)) {
			return this.handleIfElseBuilder(nodeOrComposite);
		}

		// Handle IF branch composite
		if ('ifNode' in nodeOrComposite && 'trueBranch' in nodeOrComposite) {
			return this.handleIfElseComposite(nodeOrComposite as IfElseComposite);
		}

		// Handle SwitchCaseBuilder (fluent API) - check before SwitchCaseComposite
		if (isSwitchCaseBuilder(nodeOrComposite)) {
			return this.handleSwitchCaseBuilder(nodeOrComposite);
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

		// Check if node already exists in the workflow (cycle connection)
		const existingNode = newNodes.has(node.name);

		if (existingNode) {
			// Node already exists - just add the connection, don't re-add the node
			if (this._currentNode) {
				const currentGraphNode = newNodes.get(this._currentNode);
				if (currentGraphNode) {
					const mainConns = currentGraphNode.connections.get('main') || new Map();
					const outputConnections = mainConns.get(this._currentOutput) || [];
					// Check for duplicate connections
					const alreadyConnected = outputConnections.some(
						(c: { node: string }) => c.node === node.name,
					);
					if (!alreadyConnected) {
						mainConns.set(this._currentOutput, [
							...outputConnections,
							{ node: node.name, type: 'main', index: 0 },
						]);
						currentGraphNode.connections.set('main', mainConns);
					}
				}
			}

			return this.clone({
				nodes: newNodes,
				currentNode: node.name,
				currentOutput: 0,
			});
		}

		// Add the new node and its subnodes
		this.addNodeWithSubnodes(newNodes, node);

		// Add connection target nodes (e.g., onError handlers)
		this.addSingleNodeConnectionTargets(newNodes, node);

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

	connect(
		source: NodeInstance<string, string, unknown>,
		sourceOutput: number,
		target: NodeInstance<string, string, unknown>,
		targetInput: number,
	): WorkflowBuilder {
		const newNodes = new Map(this._nodes);

		// Ensure both nodes exist in the graph
		if (!newNodes.has(source.name)) {
			this.addNodeWithSubnodes(newNodes, source);
		}
		if (!newNodes.has(target.name)) {
			this.addNodeWithSubnodes(newNodes, target);
		}

		// Add the explicit connection from source to target
		const sourceNode = newNodes.get(source.name);
		if (sourceNode) {
			const mainConns = sourceNode.connections.get('main') || new Map<number, ConnectionTarget[]>();
			const outputConns = mainConns.get(sourceOutput) || [];

			// Check if connection already exists
			const alreadyExists = outputConns.some(
				(c: ConnectionTarget) => c.node === target.name && c.index === targetInput,
			);

			if (!alreadyExists) {
				outputConns.push({ node: target.name, type: 'main', index: targetInput });
				mainConns.set(sourceOutput, outputConns);
				sourceNode.connections.set('main', mainConns);
			}
		}

		return this.clone({
			nodes: newNodes,
			currentNode: this._currentNode,
			currentOutput: this._currentOutput,
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
				for (const { target, outputIndex, targetInputIndex } of nodeConns) {
					// Resolve target node name - handles both NodeInstance and composites
					const targetName = this.resolveTargetNodeName(target);
					if (!targetName) continue;

					const mainConns = graphNode.connections.get('main') || new Map();
					const outputConns = mainConns.get(outputIndex) || [];
					// Avoid duplicates - check both target node AND input index
					const targetIndex = targetInputIndex ?? 0;
					const alreadyExists = outputConns.some(
						(c: ConnectionTarget) => c.node === targetName && c.index === targetIndex,
					);
					if (!alreadyExists) {
						outputConns.push({ node: targetName, type: 'main', index: targetIndex });
						mainConns.set(outputIndex, outputConns);
						graphNode.connections.set('main', mainConns);
					}
				}
			}
		}

		// Convert nodes
		for (const [mapKey, graphNode] of this._nodes) {
			const instance = graphNode.instance;

			// Skip invalid nodes (shouldn't happen, but defensive)
			if (!instance || !instance.name || !instance.type) {
				continue;
			}

			const config = instance.config ?? {};
			const position = config.position ?? nodePositions.get(mapKey) ?? [START_X, DEFAULT_Y];

			// Determine node name:
			// - If config has _originalName, use that (preserves undefined for sticky notes from fromJSON)
			// - If mapKey was auto-renamed (e.g., "Process 1" from "Process"), use mapKey
			// - Otherwise use instance.name (preserves original name for fromJSON imports)
			let nodeName: string | undefined;
			if ('_originalName' in config) {
				// Node was loaded via fromJSON - preserve original name (may be undefined)
				nodeName = config._originalName as string | undefined;
			} else {
				// Node was created via builder - use auto-renamed key if applicable
				const isAutoRenamed =
					mapKey !== instance.name &&
					mapKey.startsWith(instance.name + ' ') &&
					/^\d+$/.test(mapKey.slice(instance.name.length + 1));
				nodeName = isAutoRenamed ? mapKey : instance.name;
			}
			// Check if this node was loaded via fromJSON (has _originalName marker)
			const isFromJson = '_originalName' in config;

			// Serialize parameters - for SDK-created nodes, also normalize resource locators
			// (add __rl: true if missing). For fromJSON nodes, preserve parameters as-is.
			let serializedParams: IDataObject | undefined;
			if (config.parameters) {
				const parsed = JSON.parse(JSON.stringify(config.parameters));
				serializedParams = isFromJson ? parsed : (normalizeResourceLocators(parsed) as IDataObject);
			}

			const n8nNode: NodeJSON = {
				id: instance.id,
				name: nodeName,
				type: instance.type,
				typeVersion: parseVersion(instance.version),
				position,
				parameters: serializedParams,
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

				if (Object.keys(nodeConnections).length > 0 && nodeName !== undefined) {
					connections[nodeName] = nodeConnections;
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

	validate(
		options: import('./validation/index').ValidationOptions = {},
	): import('./validation/index').ValidationResult {
		const { ValidationError, ValidationWarning } = require('./validation/index');
		const errors: import('./validation/index').ValidationError[] = [];
		const warnings: import('./validation/index').ValidationWarning[] = [];

		// Check: No nodes
		if (this._nodes.size === 0) {
			errors.push(new ValidationError('NO_NODES', 'Workflow has no nodes'));
		}

		// Check: Missing trigger
		if (!options.allowNoTrigger) {
			const hasTrigger = Array.from(this._nodes.values()).some((graphNode) =>
				this.isTriggerNode(graphNode.instance.type),
			);
			if (!hasTrigger) {
				warnings.push(
					new ValidationWarning(
						'MISSING_TRIGGER',
						'Workflow has no trigger node. It will need to be started manually.',
					),
				);
			}
		}

		// Check: Disconnected nodes (non-trigger nodes without incoming connections)
		if (!options.allowDisconnectedNodes) {
			const nodesWithIncoming = this.findNodesWithIncomingConnections();
			for (const [mapKey, graphNode] of this._nodes) {
				const originalName = graphNode.instance.name;
				// Skip trigger nodes - they don't need incoming connections
				if (this.isTriggerNode(graphNode.instance.type)) {
					continue;
				}
				// Skip sticky notes - they don't participate in data flow
				if (graphNode.instance.type === 'n8n-nodes-base.stickyNote') {
					continue;
				}
				// Skip subnodes - they connect TO their parent via AI connections
				if (this.isConnectedSubnode(graphNode)) {
					continue;
				}
				// Check if this node has any incoming connection (use mapKey, not originalName)
				if (!nodesWithIncoming.has(mapKey)) {
					const isRenamed = this.isAutoRenamed(mapKey, originalName);
					const displayName = isRenamed ? mapKey : originalName;
					const origForWarning = isRenamed ? originalName : undefined;
					warnings.push(
						new ValidationWarning(
							'DISCONNECTED_NODE',
							`${this.formatNodeRef(displayName, origForWarning, graphNode.instance.type)} is not connected to any input. It will not receive data.`,
							displayName,
							origForWarning,
						),
					);
				}
			}
		}

		// Node-specific checks
		for (const [mapKey, graphNode] of this._nodes) {
			const nodeType = graphNode.instance.type;

			// Agent node checks
			if (nodeType === '@n8n/n8n-nodes-langchain.agent') {
				this.checkAgentNode(graphNode.instance, warnings, mapKey);
			}

			// ChainLlm node checks - only for versions >= 1.4 (when promptType was introduced)
			if (nodeType === '@n8n/n8n-nodes-langchain.chainLlm') {
				const version = parseVersion(graphNode.instance.version);
				if (version >= 1.4) {
					this.checkChainLlmNode(graphNode.instance, warnings, mapKey);
				}
			}

			// HTTP Request node checks
			if (nodeType === 'n8n-nodes-base.httpRequest') {
				this.checkHttpRequestNode(graphNode.instance, warnings, mapKey);
			}

			// Set node checks
			if (nodeType === 'n8n-nodes-base.set') {
				this.checkSetNode(graphNode.instance, warnings, mapKey);
			}

			// Merge node checks
			if (nodeType === 'n8n-nodes-base.merge') {
				this.checkMergeNode(graphNode, warnings, mapKey);
			}

			// Tool node checks
			if (this.isToolNode(nodeType)) {
				this.checkToolNode(graphNode.instance, warnings, mapKey);
			}

			// Check $fromAI in non-tool nodes
			if (!this.isToolNode(nodeType)) {
				this.checkFromAiInNonToolNode(graphNode.instance, warnings, mapKey);
			}

			// Check for {{ $... }} without = prefix (skip sticky notes - they're just documentation)
			if (graphNode.instance.type !== 'n8n-nodes-base.stickyNote') {
				this.checkMissingExpressionPrefix(graphNode.instance, warnings, mapKey);
			}
		}

		// Check: Subnode-only types used without proper AI connections
		for (const [mapKey, graphNode] of this._nodes) {
			const subnodeInfo = this.getRequiredSubnodeInfo(graphNode.instance.type);
			if (subnodeInfo) {
				// This is a subnode-only type - verify it has the required AI connection
				if (!this.hasAiConnectionOfType(graphNode, subnodeInfo.connectionType)) {
					const originalName = graphNode.instance.name;
					const isRenamed = this.isAutoRenamed(mapKey, originalName);
					const displayName = isRenamed ? mapKey : originalName;
					const origForDisplay = isRenamed ? originalName : undefined;
					const nodeRef = this.formatNodeRef(displayName, origForDisplay, graphNode.instance.type);

					errors.push(
						new ValidationError(
							'SUBNODE_NOT_CONNECTED',
							`${nodeRef} is a subnode that must be connected to a parent node as ${subnodeInfo.subnodeField}, but it has no such connection. Use the appropriate subnode factory (e.g., embedding(), languageModel()) and connect it to a parent node's subnodes config.`,
							displayName,
						),
					);
				}
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Check if a node was auto-renamed (pattern: "Name" -> "Name 1", "Name 2", etc.)
	 */
	private isAutoRenamed(mapKey: string, originalName: string): boolean {
		if (mapKey === originalName) return false;
		if (!mapKey.startsWith(originalName + ' ')) return false;
		const suffix = mapKey.slice(originalName.length + 1);
		return /^\d+$/.test(suffix);
	}

	/**
	 * Format a node reference for warning messages, including node type and original name if renamed
	 */
	private formatNodeRef(displayName: string, originalName?: string, nodeType?: string): string {
		const typeSuffix = nodeType ? ` [${nodeType}]` : '';
		if (originalName && originalName !== displayName) {
			return `'${displayName}' (originally '${originalName}')${typeSuffix}`;
		}
		return `'${displayName}'${typeSuffix}`;
	}

	/**
	 * Check Agent node for common issues
	 */
	private checkAgentNode(
		instance: NodeInstance<string, string, unknown>,
		warnings: import('./validation/index').ValidationWarning[],
		mapKey: string,
	): void {
		const { ValidationWarning } = require('./validation/index');
		const params = instance.config?.parameters as Record<string, unknown> | undefined;
		if (!params) return;

		const originalName = instance.name;
		const isRenamed = this.isAutoRenamed(mapKey, originalName);
		const displayName = isRenamed ? mapKey : originalName;
		const origForWarning = isRenamed ? originalName : undefined;
		const nodeRef = this.formatNodeRef(displayName, origForWarning, instance.type);

		const promptType = params.promptType as string | undefined;

		// Skip checks for auto/guardrails mode (undefined defaults to auto)
		if (!promptType || promptType === 'auto' || promptType === 'guardrails') {
			return;
		}

		// Check: Static prompt (no expression)
		const text = params.text;
		const hasValidExpression = this.containsExpression(text);
		const hasMalformedExpression = this.containsMalformedExpression(text);

		// Only warn about static prompt if there's NO expression at all
		// (MISSING_EXPRESSION_PREFIX will handle malformed expressions)
		if (!text || (!hasValidExpression && !hasMalformedExpression)) {
			warnings.push(
				new ValidationWarning(
					'AGENT_STATIC_PROMPT',
					` Is input data required for ${nodeRef}? If so, add an expression to the prompt. When following a chat trigger node, use { promptType: 'auto', text: '={{ $json.chatInput }}' }. Or use { promptType: 'define', text: '={{ ... }}' } to add dynamic data like input data.`,
					displayName,
					origForWarning,
				),
			);
		}

		// Check: No system message
		const options = params.options as Record<string, unknown> | undefined;
		const systemMessage = options?.systemMessage;
		if (
			!systemMessage ||
			(typeof systemMessage === 'string' && systemMessage.trim().length === 0)
		) {
			warnings.push(
				new ValidationWarning(
					'AGENT_NO_SYSTEM_MESSAGE',
					`${nodeRef} has no system message. System-level instructions should be in the system message field.`,
					displayName,
					origForWarning,
				),
			);
		}
	}

	/**
	 * Check ChainLlm node for static prompts (v1.4+ only)
	 */
	private checkChainLlmNode(
		instance: NodeInstance<string, string, unknown>,
		warnings: import('./validation/index').ValidationWarning[],
		mapKey: string,
	): void {
		const { ValidationWarning } = require('./validation/index');
		const params = instance.config?.parameters as Record<string, unknown> | undefined;
		if (!params) return;

		const originalName = instance.name;
		const isRenamed = this.isAutoRenamed(mapKey, originalName);
		const displayName = isRenamed ? mapKey : originalName;
		const origForWarning = isRenamed ? originalName : undefined;
		const nodeRef = this.formatNodeRef(displayName, origForWarning, instance.type);

		const promptType = params.promptType as string | undefined;

		// Only check when promptType is 'define' (explicit prompt definition)
		if (promptType !== 'define') {
			return;
		}

		// Check: Static prompt (no expression)
		const text = params.text;
		const hasValidExpression = this.containsExpression(text);
		const hasMalformedExpression = this.containsMalformedExpression(text);

		// Only warn about static prompt if there's NO expression at all
		// (MISSING_EXPRESSION_PREFIX will handle malformed expressions)
		if (!text || (!hasValidExpression && !hasMalformedExpression)) {
			warnings.push(
				new ValidationWarning(
					'AGENT_STATIC_PROMPT',
					`${nodeRef} has no expression in its prompt. Parameter values must start with '=' to evaluate correctly as expressions. For example '={{ $json.input }}'.`,
					displayName,
					origForWarning,
				),
			);
		}
	}

	/**
	 * Check if a value contains an n8n expression
	 */
	private containsExpression(value: unknown): boolean {
		if (typeof value !== 'string') {
			return false;
		}
		return value.includes('={{') || value.startsWith('=');
	}

	/**
	 * Check if a value contains a malformed expression ({{ $ without = prefix)
	 */
	private containsMalformedExpression(value: unknown): boolean {
		if (typeof value !== 'string') {
			return false;
		}
		return !value.startsWith('=') && value.includes('{{ $');
	}

	/**
	 * Check HTTP Request node for hardcoded credentials
	 */
	private checkHttpRequestNode(
		instance: NodeInstance<string, string, unknown>,
		warnings: import('./validation/index').ValidationWarning[],
		mapKey: string,
	): void {
		const { ValidationWarning } = require('./validation/index');
		const params = instance.config?.parameters as Record<string, unknown> | undefined;
		if (!params) return;

		const originalName = instance.name;
		const isRenamed = this.isAutoRenamed(mapKey, originalName);
		const displayName = isRenamed ? mapKey : originalName;
		const origForWarning = isRenamed ? originalName : undefined;
		const nodeRef = this.formatNodeRef(displayName, origForWarning, instance.type);

		// Check header parameters for sensitive headers
		const headerParams = params.headerParameters as
			| { parameters?: Array<{ name?: string; value?: unknown }> }
			| undefined;
		if (headerParams?.parameters) {
			for (const header of headerParams.parameters) {
				if (
					header.name &&
					this.isSensitiveHeader(header.name) &&
					header.value &&
					!this.containsExpression(String(header.value))
				) {
					warnings.push(
						new ValidationWarning(
							'HARDCODED_CREDENTIALS',
							`${nodeRef} has a hardcoded value for sensitive header "${header.name}". Use n8n credentials instead.`,
							displayName,
							origForWarning,
						),
					);
				}
			}
		}

		// Check query parameters for credential-like names
		const queryParams = params.queryParameters as
			| { parameters?: Array<{ name?: string; value?: unknown }> }
			| undefined;
		if (queryParams?.parameters) {
			for (const param of queryParams.parameters) {
				if (
					param.name &&
					this.isCredentialFieldName(param.name) &&
					param.value &&
					!this.containsExpression(String(param.value))
				) {
					warnings.push(
						new ValidationWarning(
							'HARDCODED_CREDENTIALS',
							`${nodeRef} has a hardcoded value for credential-like query parameter "${param.name}". Use n8n credentials instead.`,
							displayName,
							origForWarning,
						),
					);
				}
			}
		}
	}

	/**
	 * Check if a header name is sensitive (typically contains credentials)
	 */
	private isSensitiveHeader(name: string): boolean {
		const sensitiveHeaders = new Set([
			'authorization',
			'x-api-key',
			'x-auth-token',
			'x-access-token',
			'api-key',
			'apikey',
		]);
		return sensitiveHeaders.has(name.toLowerCase());
	}

	/**
	 * Check if a field name looks like it's meant to store credentials
	 */
	private isCredentialFieldName(name: string): boolean {
		const patterns = [
			/api[_-]?key/i,
			/access[_-]?token/i,
			/auth[_-]?token/i,
			/bearer[_-]?token/i,
			/secret[_-]?key/i,
			/private[_-]?key/i,
			/client[_-]?secret/i,
			/password/i,
			/credentials?/i,
			/^token$/i,
			/^secret$/i,
			/^auth$/i,
		];
		return patterns.some((pattern) => pattern.test(name));
	}

	/**
	 * Check Set node for credential-like field names
	 */
	private checkSetNode(
		instance: NodeInstance<string, string, unknown>,
		warnings: import('./validation/index').ValidationWarning[],
		mapKey: string,
	): void {
		const { ValidationWarning } = require('./validation/index');
		const params = instance.config?.parameters as Record<string, unknown> | undefined;
		if (!params) return;

		const originalName = instance.name;
		const isRenamed = this.isAutoRenamed(mapKey, originalName);
		const displayName = isRenamed ? mapKey : originalName;
		const origForWarning = isRenamed ? originalName : undefined;
		const nodeRef = this.formatNodeRef(displayName, origForWarning, instance.type);

		const assignments = params.assignments as
			| { assignments?: Array<{ name?: string; value?: unknown; type?: string }> }
			| undefined;
		if (!assignments?.assignments) return;

		for (const assignment of assignments.assignments) {
			if (assignment.name && this.isCredentialFieldName(assignment.name)) {
				warnings.push(
					new ValidationWarning(
						'SET_CREDENTIAL_FIELD',
						`${nodeRef} has a field named "${assignment.name}" which appears to be storing credentials. Use n8n's credential system instead.`,
						displayName,
						origForWarning,
					),
				);
			}
		}
	}

	/**
	 * Check Merge node for proper input connections
	 */
	private checkMergeNode(
		graphNode: GraphNode,
		warnings: import('./validation/index').ValidationWarning[],
		mapKey: string,
	): void {
		const { ValidationWarning } = require('./validation/index');
		const instance = graphNode.instance;
		const originalName = instance.name;
		const isRenamed = this.isAutoRenamed(mapKey, originalName);
		const displayName = isRenamed ? mapKey : originalName;
		const origForWarning = isRenamed ? originalName : undefined;
		const nodeRef = this.formatNodeRef(displayName, origForWarning, instance.type);

		// Track which distinct input indices have connections
		const connectedInputIndices = new Set<number>();

		// Check all other nodes' connections (graphNode.connections stores OUTGOING connections)
		// We need to find connections where this merge node is the TARGET
		for (const [_name, otherNode] of this._nodes) {
			const mainConns = otherNode.connections.get('main');
			if (mainConns) {
				for (const [_outputIndex, targets] of mainConns) {
					for (const target of targets) {
						// Compare against mapKey (the actual key in the workflow, potentially renamed)
						if (target.node === mapKey) {
							connectedInputIndices.add(target.index);
						}
					}
				}
			}

			// Also check connections declared via .then() from NodeInstances
			if (typeof otherNode.instance.getConnections === 'function') {
				const conns = otherNode.instance.getConnections();
				for (const conn of conns) {
					// Handle both NodeInstance and InputTarget
					const targetNode = isInputTarget(conn.target) ? conn.target.node : conn.target;
					const targetNodeName =
						typeof targetNode === 'object' && 'name' in targetNode ? targetNode.name : undefined;
					if (targetNode === instance || targetNodeName === originalName) {
						// For InputTarget, use the specified index; for regular connections use targetInputIndex; default to 0
						const targetIndex = isInputTarget(conn.target)
							? conn.target.inputIndex
							: (conn.targetInputIndex ?? 0);
						connectedInputIndices.add(targetIndex);
					}
				}
			}
		}

		const inputCount = connectedInputIndices.size;
		if (inputCount < 2) {
			warnings.push(
				new ValidationWarning(
					'MERGE_SINGLE_INPUT',
					`${nodeRef} has only ${inputCount} input connection(s). Merge nodes require at least 2 inputs.`,
					displayName,
					origForWarning,
				),
			);
		}
	}

	/**
	 * Check if a node type is a tool node
	 */
	private isToolNode(type: string): boolean {
		return type.includes('tool') || type.includes('Tool');
	}

	/**
	 * Tools that don't require parameters
	 */
	private readonly toolsWithoutParameters = new Set([
		'@n8n/n8n-nodes-langchain.toolCalculator',
		'@n8n/n8n-nodes-langchain.toolVectorStore',
		'@n8n/n8n-nodes-langchain.vectorStoreInMemory',
		'@n8n/n8n-nodes-langchain.mcpClientTool',
		'@n8n/n8n-nodes-langchain.toolWikipedia',
		'@n8n/n8n-nodes-langchain.toolSerpApi',
	]);

	/**
	 * Check Tool node for missing parameters
	 */
	private checkToolNode(
		instance: NodeInstance<string, string, unknown>,
		warnings: import('./validation/index').ValidationWarning[],
		mapKey: string,
	): void {
		const { ValidationWarning } = require('./validation/index');

		// Skip tools that don't need parameters
		if (this.toolsWithoutParameters.has(instance.type)) {
			return;
		}

		const originalName = instance.name;
		const isRenamed = this.isAutoRenamed(mapKey, originalName);
		const displayName = isRenamed ? mapKey : originalName;
		const origForWarning = isRenamed ? originalName : undefined;
		const nodeRef = this.formatNodeRef(displayName, origForWarning, instance.type);

		const params = instance.config?.parameters;
		if (!params || Object.keys(params).length === 0) {
			warnings.push(
				new ValidationWarning(
					'TOOL_NO_PARAMETERS',
					`${nodeRef} has no parameters set.`,
					displayName,
					origForWarning,
				),
			);
		}
	}

	/**
	 * Check for $fromAI usage in non-tool nodes
	 */
	private checkFromAiInNonToolNode(
		instance: NodeInstance<string, string, unknown>,
		warnings: import('./validation/index').ValidationWarning[],
		mapKey: string,
	): void {
		const { ValidationWarning } = require('./validation/index');
		const params = instance.config?.parameters;
		if (!params) return;

		const originalName = instance.name;
		const isRenamed = this.isAutoRenamed(mapKey, originalName);
		const displayName = isRenamed ? mapKey : originalName;
		const origForWarning = isRenamed ? originalName : undefined;
		const nodeRef = this.formatNodeRef(displayName, origForWarning, instance.type);

		// Recursively search for $fromAI in all parameter values
		if (this.containsFromAI(params)) {
			warnings.push(
				new ValidationWarning(
					'FROM_AI_IN_NON_TOOL',
					`${nodeRef} uses $fromAI() which is only valid in tool nodes connected to an AI agent.`,
					displayName,
					origForWarning,
				),
			);
		}
	}

	/**
	 * Recursively find all string values that have {{ $... }} without = prefix
	 */
	private findMissingExpressionPrefixes(
		value: unknown,
		path: string = '',
	): Array<{ path: string; value: string }> {
		const issues: Array<{ path: string; value: string }> = [];

		if (typeof value === 'string') {
			// If string starts with '=', it's already an expression - {{ }} is valid template syntax inside
			// Otherwise check if it contains {{ $ pattern (n8n variable reference without = prefix)
			if (!value.startsWith('=') && value.includes('{{ $')) {
				issues.push({ path, value });
			}
		} else if (Array.isArray(value)) {
			value.forEach((item, index) => {
				issues.push(...this.findMissingExpressionPrefixes(item, `${path}[${index}]`));
			});
		} else if (value && typeof value === 'object') {
			// Skip PlaceholderValue objects - their hint property is documentation, not actual expressions
			if (
				'__placeholder' in value &&
				(value as { __placeholder: boolean }).__placeholder === true
			) {
				return issues;
			}
			for (const [key, val] of Object.entries(value)) {
				const newPath = path ? `${path}.${key}` : key;
				issues.push(...this.findMissingExpressionPrefixes(val, newPath));
			}
		}

		return issues;
	}

	/**
	 * Check for {{ $... }} patterns without the required = prefix
	 */
	private checkMissingExpressionPrefix(
		instance: NodeInstance<string, string, unknown>,
		warnings: import('./validation/index').ValidationWarning[],
		mapKey: string,
	): void {
		const { ValidationWarning } = require('./validation/index');
		const params = instance.config?.parameters;
		if (!params) return;

		const originalName = instance.name;
		const isRenamed = this.isAutoRenamed(mapKey, originalName);
		const displayName = isRenamed ? mapKey : originalName;
		const origForWarning = isRenamed ? originalName : undefined;
		const nodeRef = this.formatNodeRef(displayName, origForWarning, instance.type);

		const issues = this.findMissingExpressionPrefixes(params);

		for (const { path } of issues) {
			warnings.push(
				new ValidationWarning(
					'MISSING_EXPRESSION_PREFIX',
					`${nodeRef} has parameter "${path}" containing {{ $... }} without '=' prefix. ` +
						`n8n expressions must start with '=' like '={{ $json.field }}'.`,
					displayName,
					origForWarning,
				),
			);
		}
	}

	/**
	 * Check if a value or nested object contains $fromAI expression
	 */
	private containsFromAI(value: unknown): boolean {
		if (typeof value === 'string') {
			return value.includes('$fromAI');
		}
		if (Array.isArray(value)) {
			return value.some((item) => this.containsFromAI(item));
		}
		if (typeof value === 'object' && value !== null) {
			return Object.values(value).some((v) => this.containsFromAI(v));
		}
		return false;
	}

	/**
	 * Check if a node type is a trigger
	 */
	private isTriggerNode(type: string): boolean {
		return isTriggerNodeType(type);
	}

	/**
	 * Find all nodes that have incoming connections from other nodes
	 */
	private findNodesWithIncomingConnections(): Set<string> {
		const nodesWithIncoming = new Set<string>();

		for (const [_name, graphNode] of this._nodes) {
			// Check connections stored in graphNode.connections (from workflow builder's .then())
			const mainConns = graphNode.connections.get('main');
			if (mainConns) {
				for (const [_outputIndex, targets] of mainConns) {
					for (const target of targets) {
						if (typeof target === 'object' && 'node' in target) {
							nodesWithIncoming.add(target.node as string);
						}
					}
				}
			}

			// Check connections declared via node's .then() (instance-level connections)
			if (typeof graphNode.instance.getConnections === 'function') {
				const connections = graphNode.instance.getConnections();
				for (const conn of connections) {
					// Get the target node name
					// For NodeChains, use head.name (entry point of the chain)
					if (isNodeChain(conn.target)) {
						nodesWithIncoming.add(conn.target.head.name);
					} else if (isSwitchCaseBuilder(conn.target)) {
						// SwitchCaseBuilder wraps a switch node
						nodesWithIncoming.add(conn.target.switchNode.name);
					} else if (isIfElseBuilder(conn.target)) {
						// IfElseBuilder wraps an if node
						nodesWithIncoming.add(conn.target.ifNode.name);
					} else if (typeof conn.target === 'object' && 'name' in conn.target) {
						nodesWithIncoming.add(conn.target.name);
					} else {
						nodesWithIncoming.add(String(conn.target));
					}
				}
			}
		}

		return nodesWithIncoming;
	}

	/**
	 * Check if a node is a subnode that's connected to a parent via AI connection types.
	 * Subnodes connect outward TO their parent node (not the other way around).
	 */
	private isConnectedSubnode(graphNode: GraphNode): boolean {
		const aiConnectionTypes = [
			'ai_languageModel',
			'ai_memory',
			'ai_tool',
			'ai_outputParser',
			'ai_embedding',
			'ai_vectorStore',
			'ai_retriever',
			'ai_document',
			'ai_textSplitter',
			'ai_reranker',
		];

		for (const [connType, outputMap] of graphNode.connections) {
			if (aiConnectionTypes.includes(connType)) {
				// Check if it connects to a valid parent node
				for (const [_outputIndex, targets] of outputMap) {
					if (targets.length > 0) {
						return true; // Has AI connection to parent
					}
				}
			}
		}
		return false;
	}

	/**
	 * Get the required AI connection info for subnode-only node types.
	 * Returns the expected AI connection type and friendly subnode field name if the node
	 * is a subnode-only type, or null if it's a regular node that can be used standalone.
	 */
	private getRequiredSubnodeInfo(
		nodeType: string,
	): { connectionType: string; subnodeField: string } | null {
		// Extract the node name suffix after the package prefix
		// e.g., '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini' -> 'embeddingsGoogleGemini'
		const parts = nodeType.split('.');
		const nodeName = parts.length > 1 ? parts[parts.length - 1] : nodeType;

		// Map node name patterns to required AI connection types and subnode field names
		// Field names match SubnodeConfig in sdk-api.ts
		// Excluded from validation (can be standalone):
		// - vectorStore* - Can operate in retrieval mode as standalone node
		// - retriever* - Connects to agents, complex usage patterns
		// - tool* - Many tools can work as standalone or subnodes
		// - agent, chain* - These are parent nodes that host subnodes
		if (nodeName.startsWith('embeddings')) {
			return { connectionType: 'ai_embedding', subnodeField: 'embedding' };
		}
		if (nodeName.startsWith('lm')) {
			return { connectionType: 'ai_languageModel', subnodeField: 'model' };
		}
		if (nodeName.startsWith('memory')) {
			return { connectionType: 'ai_memory', subnodeField: 'memory' };
		}
		if (nodeName.startsWith('outputParser')) {
			return { connectionType: 'ai_outputParser', subnodeField: 'outputParser' };
		}
		if (nodeName.startsWith('document')) {
			return { connectionType: 'ai_document', subnodeField: 'documentLoader' };
		}
		if (nodeName.startsWith('textSplitter')) {
			return { connectionType: 'ai_textSplitter', subnodeField: 'textSplitter' };
		}
		if (nodeName.startsWith('reranker')) {
			return { connectionType: 'ai_reranker', subnodeField: 'reranker' };
		}

		return null;
	}

	/**
	 * Check if a node has a specific AI connection type to a parent node.
	 */
	private hasAiConnectionOfType(graphNode: GraphNode, connectionType: string): boolean {
		const outputMap = graphNode.connections.get(connectionType);
		if (!outputMap) return false;
		for (const [_outputIndex, targets] of outputMap) {
			if (targets.length > 0) {
				return true;
			}
		}
		return false;
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
	 * A batch of nodes - either a single node or an array of nodes for fan-out
	 */
	// NodeBatch type alias is local to avoid circular dependencies

	/**
	 * Extract the SplitInBatchesBuilder from a value (handles both direct builder and chains)
	 */
	private extractSplitInBatchesBuilder(value: unknown): {
		sibNode: NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>;
		_doneNodes: NodeInstance<string, string, unknown>[];
		_eachNodes: NodeInstance<string, string, unknown>[];
		_doneBatches: Array<
			NodeInstance<string, string, unknown> | NodeInstance<string, string, unknown>[]
		>;
		_eachBatches: Array<
			NodeInstance<string, string, unknown> | NodeInstance<string, string, unknown>[]
		>;
		_hasLoop: boolean;
		// Named syntax properties (optional - only present for splitInBatches(node, { done, each }))
		_doneTarget?: unknown;
		_eachTarget?: unknown;
	} {
		// Direct builder
		if ('sibNode' in (value as object)) {
			return value as {
				sibNode: NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>;
				_doneNodes: NodeInstance<string, string, unknown>[];
				_eachNodes: NodeInstance<string, string, unknown>[];
				_doneBatches: Array<
					NodeInstance<string, string, unknown> | NodeInstance<string, string, unknown>[]
				>;
				_eachBatches: Array<
					NodeInstance<string, string, unknown> | NodeInstance<string, string, unknown>[]
				>;
				_hasLoop: boolean;
				_doneTarget?: unknown;
				_eachTarget?: unknown;
			};
		}

		// Chain with _parent - extract the parent builder
		const chain = value as { _parent: unknown };
		return chain._parent as {
			sibNode: NodeInstance<'n8n-nodes-base.splitInBatches', string, unknown>;
			_doneNodes: NodeInstance<string, string, unknown>[];
			_eachNodes: NodeInstance<string, string, unknown>[];
			_doneBatches: Array<
				NodeInstance<string, string, unknown> | NodeInstance<string, string, unknown>[]
			>;
			_eachBatches: Array<
				NodeInstance<string, string, unknown> | NodeInstance<string, string, unknown>[]
			>;
			_hasLoop: boolean;
			_doneTarget?: unknown;
			_eachTarget?: unknown;
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
	 * Find the map key for a node instance by its ID.
	 * This handles renamed duplicate nodes where the map key differs from instance.name.
	 */
	private findMapKeyForNodeId(nodeId: string): string | undefined {
		for (const [key, graphNode] of this._nodes) {
			if (graphNode.instance.id === nodeId) {
				return key;
			}
		}
		return undefined;
	}

	/**
	 * Resolve the target node name from a connection target.
	 * Handles NodeInstance, NodeChain, and composites (SwitchCaseComposite, IfElseComposite, MergeComposite).
	 * Returns the map key (which may differ from instance.name for renamed duplicates).
	 * @param nameMapping - Optional map from node ID to actual map key (used when nodes are renamed during addBranchToGraph)
	 */
	private resolveTargetNodeName(
		target: unknown,
		nameMapping?: Map<string, string>,
	): string | undefined {
		if (target === null || typeof target !== 'object') return undefined;

		// Helper to get the actual node name, accounting for auto-renamed nodes
		const getNodeName = (nodeInstance: NodeInstance<string, string, unknown>): string => {
			// First check the passed-in nameMapping (used during addBranchToGraph)
			const mappedKey = nameMapping?.get(nodeInstance.id);
			if (mappedKey) return mappedKey;

			// Fall back to searching in this._nodes
			const mapKey = this.findMapKeyForNodeId(nodeInstance.id);
			if (!mapKey) return nodeInstance.name;

			// Check if this is an auto-renamed node (e.g., "Process 1" from "Process")
			// Auto-renamed nodes have pattern: mapKey = instance.name + " " + number
			const isAutoRenamed =
				mapKey !== nodeInstance.name &&
				mapKey.startsWith(nodeInstance.name + ' ') &&
				/^\d+$/.test(mapKey.slice(nodeInstance.name.length + 1));

			return isAutoRenamed ? mapKey : nodeInstance.name;
		};

		// Check for NodeChain - return the head's name (where connections enter the chain)
		if (isNodeChain(target)) {
			return getNodeName(target.head);
		}

		// Check for SwitchCaseComposite
		if (this.isSwitchCaseComposite(target)) {
			return getNodeName((target as SwitchCaseComposite).switchNode);
		}

		// Check for IfElseComposite
		if (this.isIfElseComposite(target)) {
			return getNodeName((target as IfElseComposite).ifNode);
		}

		// Check for MergeComposite
		if (this.isMergeComposite(target)) {
			return getNodeName((target as MergeComposite).mergeNode);
		}

		// Check for IfElseBuilder (fluent API)
		if (isIfElseBuilder(target)) {
			return getNodeName((target as IfElseBuilder<unknown>).ifNode);
		}

		// Check for SwitchCaseBuilder (fluent API)
		if (isSwitchCaseBuilder(target)) {
			return getNodeName((target as SwitchCaseBuilder<unknown>).switchNode);
		}

		// Check for SplitInBatchesBuilder or its chains (EachChainImpl/DoneChainImpl)
		if (this.isSplitInBatchesBuilder(target)) {
			const builder = this.extractSplitInBatchesBuilder(target);
			return getNodeName(builder.sibNode);
		}

		// Check for InputTarget - return the referenced node's name
		if (isInputTarget(target)) {
			return getNodeName(target.node as NodeInstance<string, string, unknown>);
		}

		// Regular NodeInstance
		return getNodeName(target as NodeInstance<string, string, unknown>);
	}

	/**
	 * Check if value is an IfElseComposite
	 */
	private isIfElseComposite(value: unknown): boolean {
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
	 * Check if value is a NodeInstance (has type, version, config, then method)
	 */
	private isNodeInstance(value: unknown): boolean {
		if (value === null || typeof value !== 'object') return false;
		return (
			'type' in value &&
			'version' in value &&
			'config' in value &&
			'then' in value &&
			typeof (value as NodeInstance<string, string, unknown>).then === 'function'
		);
	}

	/**
	 * Get the head node name from a target (which could be a node, chain, or composite)
	 */
	private getTargetNodeName(target: unknown): string | undefined {
		if (target === null) return undefined;

		// Handle NodeChain
		if (isNodeChain(target)) {
			return (target as NodeChain).head.name;
		}

		// Handle composites
		if (this.isIfElseComposite(target)) {
			return (target as IfElseComposite).ifNode.name;
		}

		if (this.isSwitchCaseComposite(target)) {
			return (target as SwitchCaseComposite).switchNode.name;
		}

		if (this.isMergeComposite(target)) {
			return (target as MergeComposite<NodeInstance<string, string, unknown>[]>).mergeNode.name;
		}

		// Handle IfElseBuilder (fluent API)
		if (isIfElseBuilder(target)) {
			return (target as IfElseBuilder<unknown>).ifNode.name;
		}

		// Handle SwitchCaseBuilder (fluent API)
		if (isSwitchCaseBuilder(target)) {
			return (target as SwitchCaseBuilder<unknown>).switchNode.name;
		}

		// Handle SplitInBatchesBuilder (including EachChain/DoneChain)
		if (this.isSplitInBatchesBuilder(target)) {
			const builder = this.extractSplitInBatchesBuilder(target);
			return builder.sibNode.name;
		}

		// Handle NodeInstance
		if (typeof target === 'object' && 'name' in target) {
			return (target as NodeInstance<string, string, unknown>).name;
		}

		return undefined;
	}

	/**
	 * Add target nodes from a chain's connections that aren't already in the nodes map.
	 * This handles nodes added via .onError() which aren't included in the chain's allNodes.
	 * @param nameMapping - Optional map from node ID to actual map key (used when nodes are renamed)
	 */
	private addConnectionTargetNodes(
		nodes: Map<string, GraphNode>,
		chain: NodeChain,
		nameMapping?: Map<string, string>,
	): void {
		const connections = chain.getConnections();
		for (const { target } of connections) {
			// Skip if target is a composite or builder (already handled elsewhere)
			if (this.isSwitchCaseComposite(target)) continue;
			if (this.isIfElseComposite(target)) continue;
			if (this.isMergeComposite(target)) continue;
			if (this.isSplitInBatchesBuilder(target)) continue;
			if (isIfElseBuilder(target)) continue;
			if (isSwitchCaseBuilder(target)) continue;

			// Handle NodeChains - use addBranchToGraph to add all nodes with their connections
			if (isNodeChain(target)) {
				this.addBranchToGraph(nodes, target as NodeChain, nameMapping);
				continue;
			}

			// Handle InputTarget - add the referenced node
			if (isInputTarget(target)) {
				const inputTargetNode = target.node as NodeInstance<string, string, unknown>;
				if (!nodes.has(inputTargetNode.name)) {
					const actualKey = this.addNodeWithSubnodes(nodes, inputTargetNode);
					if (actualKey && nameMapping && actualKey !== inputTargetNode.name) {
						nameMapping.set(inputTargetNode.id, actualKey);
					}
				}
				continue;
			}

			// Add the target node if not already in the map
			const targetNode = target as NodeInstance<string, string, unknown>;
			if (!nodes.has(targetNode.name)) {
				const actualKey = this.addNodeWithSubnodes(nodes, targetNode);
				if (actualKey && nameMapping && actualKey !== targetNode.name) {
					nameMapping.set(targetNode.id, actualKey);
				}
			}
		}
	}

	/**
	 * Add target nodes from a single node's connections (e.g., onError handlers).
	 * This handles connection targets that aren't part of a chain.
	 */
	private addSingleNodeConnectionTargets(
		nodes: Map<string, GraphNode>,
		nodeInstance: NodeInstance<string, string, unknown>,
	): void {
		// Check if node has getConnections method (some composites don't)
		if (typeof nodeInstance.getConnections !== 'function') return;

		const connections = nodeInstance.getConnections();
		for (const { target } of connections) {
			// Skip if target is a composite or builder (already handled elsewhere)
			if (this.isSwitchCaseComposite(target)) continue;
			if (this.isIfElseComposite(target)) continue;
			if (this.isMergeComposite(target)) continue;
			if (this.isSplitInBatchesBuilder(target)) continue;
			if (isIfElseBuilder(target)) continue;
			if (isSwitchCaseBuilder(target)) continue;

			// Handle NodeChains - use addBranchToGraph to add all nodes with their connections
			if (isNodeChain(target)) {
				this.addBranchToGraph(nodes, target as NodeChain);
				continue;
			}

			// Handle InputTarget - add the referenced node
			if (isInputTarget(target)) {
				const inputTargetNode = target.node as NodeInstance<string, string, unknown>;
				if (!nodes.has(inputTargetNode.name)) {
					this.addNodeWithSubnodes(nodes, inputTargetNode);
				}
				continue;
			}

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
		// Skip null cases (unconnected outputs)
		// Handle arrays for fan-out (one output to multiple parallel nodes)
		composite.cases.forEach((caseNode, index) => {
			if (caseNode === null) {
				return; // Skip null cases - no connection for this output
			}

			// Check if caseNode is an array (fan-out pattern)
			if (Array.isArray(caseNode)) {
				// Fan-out: multiple parallel targets from this case
				const targets: ConnectionTarget[] = [];
				for (const branchNode of caseNode) {
					if (branchNode === null) continue;
					const branchHead = this.addBranchToGraph(nodes, branchNode);
					targets.push({ node: branchHead, type: 'main', index: 0 });
				}
				if (targets.length > 0) {
					switchMainConns.set(index, targets);
				}
			} else {
				const caseHeadName = this.addBranchToGraph(nodes, caseNode);
				switchMainConns.set(index, [{ node: caseHeadName, type: 'main', index: 0 }]);
			}
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
	 * Add nodes from a branch target to the nodes map, recursively handling nested composites.
	 * This ensures nested ifElse/switchCase composites get their internal connections set up.
	 */
	private addBranchTargetNodes(nodes: Map<string, GraphNode>, target: unknown): void {
		if (target === null || target === undefined) return;

		// Handle array (fan-out) - process each target
		if (Array.isArray(target)) {
			for (const t of target) {
				this.addBranchTargetNodes(nodes, t);
			}
			return;
		}

		// Handle fluent API builders FIRST (before composites)
		// IfElseBuilder and SwitchCaseBuilder have similar properties to their composite counterparts
		// so we must check for builders first to avoid incorrect dispatch
		if (isIfElseBuilder(target)) {
			const builder = target as IfElseBuilder<unknown>;
			// Only process if not already in the nodes map (prevent duplicate processing)
			if (!nodes.has(builder.ifNode.name)) {
				this.addIfElseBuilderNodes(nodes, builder);
			}
			return;
		}

		if (isSwitchCaseBuilder(target)) {
			const builder = target as SwitchCaseBuilder<unknown>;
			// Only process if not already in the nodes map (prevent duplicate processing)
			if (!nodes.has(builder.switchNode.name)) {
				this.addSwitchCaseBuilderNodes(nodes, builder);
			}
			return;
		}

		// Handle nested IfElse composite - recursively add its nodes AND connections
		if (this.isIfElseComposite(target)) {
			const ifComposite = target as IfElseComposite;
			// Only process if not already in the nodes map (prevent duplicate processing)
			if (!nodes.has(ifComposite.ifNode.name)) {
				this.addIfElseNodes(nodes, ifComposite);
			}
			return;
		}

		// Handle nested SwitchCase composite - recursively add its nodes AND connections
		if (this.isSwitchCaseComposite(target)) {
			const switchComposite = target as SwitchCaseComposite;
			// Only process if not already in the nodes map (prevent duplicate processing)
			if (!nodes.has(switchComposite.switchNode.name)) {
				this.addSwitchCaseNodes(nodes, switchComposite);
			}
			return;
		}

		// Handle nested Merge composite
		if (this.isMergeComposite(target)) {
			const mergeComposite = target as MergeComposite<NodeInstance<string, string, unknown>[]>;
			// Only process if not already in the nodes map (prevent duplicate processing)
			if (!nodes.has(mergeComposite.mergeNode.name)) {
				this.addMergeNodes(nodes, mergeComposite);
			}
			return;
		}

		// Handle SplitInBatches builder
		if (this.isSplitInBatchesBuilder(target)) {
			this.addSplitInBatchesChainNodes(nodes, target);
			return;
		}

		// Handle NodeChain - add all nodes in the chain with connections
		if (isNodeChain(target)) {
			this.addBranchToGraph(nodes, target as NodeChain);
			return;
		}

		// Handle single NodeInstance
		if (this.isNodeInstance(target)) {
			this.addBranchToGraph(nodes, target as NodeInstance<string, string, unknown>);
			return;
		}
	}

	/**
	 * Add nodes from an IfElseComposite to the nodes map
	 * Supports array branches for fan-out patterns (one output to multiple parallel nodes)
	 */
	private addIfElseNodes(nodes: Map<string, GraphNode>, composite: IfElseComposite): void {
		// Build the IF node connections to its branches
		const ifMainConns = new Map<number, ConnectionTarget[]>();

		// Add branch nodes (may be NodeChain, single node, or array of nodes for fan-out)
		if (composite.trueBranch) {
			if (Array.isArray(composite.trueBranch)) {
				// Fan-out: multiple parallel targets from trueBranch
				const targets: ConnectionTarget[] = [];
				for (const branchNode of composite.trueBranch) {
					const branchHead = this.addBranchToGraph(nodes, branchNode);
					targets.push({ node: branchHead, type: 'main', index: 0 });
				}
				ifMainConns.set(0, targets);
			} else {
				const trueBranchHead = this.addBranchToGraph(nodes, composite.trueBranch);
				ifMainConns.set(0, [{ node: trueBranchHead, type: 'main', index: 0 }]);
			}
		}
		if (composite.falseBranch) {
			if (Array.isArray(composite.falseBranch)) {
				// Fan-out: multiple parallel targets from falseBranch
				const targets: ConnectionTarget[] = [];
				for (const branchNode of composite.falseBranch) {
					const branchHead = this.addBranchToGraph(nodes, branchNode);
					targets.push({ node: branchHead, type: 'main', index: 0 });
				}
				ifMainConns.set(1, targets);
			} else {
				const falseBranchHead = this.addBranchToGraph(nodes, composite.falseBranch);
				ifMainConns.set(1, [{ node: falseBranchHead, type: 'main', index: 0 }]);
			}
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
	 * Get the input index for a source node in a merge's named inputs.
	 * Returns undefined if the target is not a merge with named inputs or if the source is not found.
	 */
	private getMergeInputIndexForSource(
		sourceNode: NodeInstance<string, string, unknown>,
		mergeTarget: unknown,
	): number | undefined {
		if (!this.isMergeComposite(mergeTarget)) return undefined;
		const mergeComposite = mergeTarget as MergeComposite<NodeInstance<string, string, unknown>[]>;
		if (!isMergeNamedInputSyntax(mergeComposite)) return undefined;

		const namedMerge = mergeComposite as MergeComposite<NodeInstance<string, string, unknown>[]> & {
			inputMapping: Map<number, NodeInstance<string, string, unknown>[]>;
		};

		// Find which input index this source node is mapped to
		for (const [inputIndex, tailNodes] of namedMerge.inputMapping) {
			for (const tailNode of tailNodes) {
				if (tailNode === sourceNode || tailNode.name === sourceNode.name) {
					return inputIndex;
				}
			}
		}
		return undefined;
	}

	/**
	 * Add nodes from an IfElseBuilder (fluent API) to the nodes map
	 */
	private addIfElseBuilderNodes(
		nodes: Map<string, GraphNode>,
		builder: IfElseBuilder<unknown>,
	): void {
		// Build the IF node connections to its branches
		const ifMainConns = new Map<number, ConnectionTarget[]>();

		// IMPORTANT: Build IF connections BEFORE adding branch nodes
		// This ensures that when addMergeNodes runs, it can detect existing IF→Merge connections
		// and skip creating duplicates at the wrong output index

		// Connect IF to true branch (output 0)
		// Always create this connection - the IF builder knows the correct output index
		// (Merge nodes will skip duplicates when they process their named inputs)
		if (builder.trueBranch !== null && builder.trueBranch !== undefined) {
			const target = builder.trueBranch;
			if (Array.isArray(target)) {
				const targets: ConnectionTarget[] = [];
				for (const t of target) {
					const targetName = this.getTargetNodeName(t);
					if (targetName) {
						// For merge targets, use the input index from the merge's named inputs if available
						const targetInputIndex = this.getMergeInputIndexForSource(builder.ifNode, t) ?? 0;
						targets.push({ node: targetName, type: 'main', index: targetInputIndex });
					}
				}
				if (targets.length > 0) {
					ifMainConns.set(0, targets);
				}
			} else {
				const targetName = this.getTargetNodeName(target);
				if (targetName) {
					// For merge targets, use the input index from the merge's named inputs if available
					const targetInputIndex = this.getMergeInputIndexForSource(builder.ifNode, target) ?? 0;
					ifMainConns.set(0, [{ node: targetName, type: 'main', index: targetInputIndex }]);
				}
			}
		}

		// Connect IF to false branch (output 1)
		// Always create this connection - the IF builder knows the correct output index
		if (builder.falseBranch !== null && builder.falseBranch !== undefined) {
			const target = builder.falseBranch;
			if (Array.isArray(target)) {
				const targets: ConnectionTarget[] = [];
				for (const t of target) {
					const targetName = this.getTargetNodeName(t);
					if (targetName) {
						// For merge targets, use the input index from the merge's named inputs if available
						const targetInputIndex = this.getMergeInputIndexForSource(builder.ifNode, t) ?? 0;
						targets.push({ node: targetName, type: 'main', index: targetInputIndex });
					}
				}
				if (targets.length > 0) {
					ifMainConns.set(1, targets);
				}
			} else {
				const targetName = this.getTargetNodeName(target);
				if (targetName) {
					// For merge targets, use the input index from the merge's named inputs if available
					const targetInputIndex = this.getMergeInputIndexForSource(builder.ifNode, target) ?? 0;
					ifMainConns.set(1, [{ node: targetName, type: 'main', index: targetInputIndex }]);
				}
			}
		}

		// Add the IF node with connections to branches
		// If the node already exists (e.g., added by addMergeNodes via addBranchToGraph),
		// merge the connections rather than overwriting
		const existingIfNode = nodes.get(builder.ifNode.name);
		if (existingIfNode) {
			// Merge ifMainConns into existing connections
			const existingMainConns = existingIfNode.connections.get('main') || new Map();
			for (const [outputIndex, targets] of ifMainConns) {
				const existingTargets = existingMainConns.get(outputIndex) || [];
				// Add new targets that don't already exist
				for (const target of targets) {
					const alreadyExists = existingTargets.some(
						(t: ConnectionTarget) => t.node === target.node && t.index === target.index,
					);
					if (!alreadyExists) {
						existingTargets.push(target);
					}
				}
				existingMainConns.set(outputIndex, existingTargets);
			}
			existingIfNode.connections.set('main', existingMainConns);
		} else {
			// Node doesn't exist, add it fresh
			const ifConns = new Map<string, Map<number, ConnectionTarget[]>>();
			ifConns.set('main', ifMainConns);
			nodes.set(builder.ifNode.name, {
				instance: builder.ifNode,
				connections: ifConns,
			});
		}

		// NOW add branch nodes - this must happen AFTER IF node is added with its connections
		// so that addMergeNodes can detect existing IF→Merge connections and skip duplicates
		this.addBranchTargetNodes(nodes, builder.trueBranch);
		this.addBranchTargetNodes(nodes, builder.falseBranch);
	}

	/**
	 * Add nodes from a SwitchCaseBuilder (fluent API) to the nodes map
	 */
	private addSwitchCaseBuilderNodes(
		nodes: Map<string, GraphNode>,
		builder: SwitchCaseBuilder<unknown>,
	): void {
		// Build the Switch node connections to its cases
		const switchMainConns = new Map<number, ConnectionTarget[]>();

		// IMPORTANT: Build Switch connections BEFORE adding case nodes
		// This ensures that when addMergeNodes runs, it can detect existing Switch→Merge connections
		// and skip creating duplicates at the wrong output index

		// Connect switch to each case at the correct output index
		// Always create connections - the Switch builder knows the correct output index
		// (Merge nodes will skip duplicates when they process their named inputs)
		for (const [caseIndex, target] of builder.caseMapping) {
			if (target === null) continue; // Skip null cases

			if (Array.isArray(target)) {
				// Fan-out: multiple targets from one case
				const targets: ConnectionTarget[] = [];
				for (const t of target) {
					const targetName = this.getTargetNodeName(t);
					if (targetName) {
						// For merge targets, use the input index from the merge's named inputs if available
						const targetInputIndex = this.getMergeInputIndexForSource(builder.switchNode, t) ?? 0;
						targets.push({ node: targetName, type: 'main', index: targetInputIndex });
					}
				}
				if (targets.length > 0) {
					switchMainConns.set(caseIndex, targets);
				}
			} else {
				// Single target
				const targetName = this.getTargetNodeName(target);
				if (targetName) {
					// For merge targets, use the input index from the merge's named inputs if available
					const targetInputIndex =
						this.getMergeInputIndexForSource(builder.switchNode, target) ?? 0;
					switchMainConns.set(caseIndex, [
						{ node: targetName, type: 'main', index: targetInputIndex },
					]);
				}
			}
		}

		// Add the Switch node with connections to cases
		// If the node already exists (e.g., added by addMergeNodes via addBranchToGraph),
		// merge the connections rather than overwriting
		const existingNode = nodes.get(builder.switchNode.name);
		if (existingNode) {
			// Merge switchMainConns into existing connections
			const existingMainConns = existingNode.connections.get('main') || new Map();
			for (const [outputIndex, targets] of switchMainConns) {
				const existingTargets = existingMainConns.get(outputIndex) || [];
				// Add new targets that don't already exist
				for (const target of targets) {
					const alreadyExists = existingTargets.some(
						(t: ConnectionTarget) => t.node === target.node && t.index === target.index,
					);
					if (!alreadyExists) {
						existingTargets.push(target);
					}
				}
				existingMainConns.set(outputIndex, existingTargets);
			}
			existingNode.connections.set('main', existingMainConns);
		} else {
			// Node doesn't exist, add it fresh
			const switchConns = new Map<string, Map<number, ConnectionTarget[]>>();
			switchConns.set('main', switchMainConns);
			nodes.set(builder.switchNode.name, {
				instance: builder.switchNode,
				connections: switchConns,
			});
		}

		// NOW add case nodes - this must happen AFTER Switch node is added with its connections
		// so that addMergeNodes can detect existing Switch→Merge connections and skip duplicates
		for (const [, target] of builder.caseMapping) {
			this.addBranchTargetNodes(nodes, target);
		}

		// Add nodes from source chain if present (e.g., trigger.to(switch).onCase(...))
		const builderImpl = builder as {
			sourceChain?: NodeChain<
				NodeInstance<string, string, unknown>,
				NodeInstance<string, string, unknown>
			>;
		};
		if (builderImpl.sourceChain) {
			this.addBranchToGraph(nodes, builderImpl.sourceChain);
		}
	}

	/**
	 * Add nodes from a MergeComposite to the nodes map
	 */
	private addMergeNodes(
		nodes: Map<string, GraphNode>,
		composite: MergeComposite<NodeInstance<string, string, unknown>[]>,
	): void {
		// Add the merge node first (without connections, branches connect TO it)
		const mergeConns = new Map<string, Map<number, ConnectionTarget[]>>();
		mergeConns.set('main', new Map());
		nodes.set(composite.mergeNode.name, {
			instance: composite.mergeNode,
			connections: mergeConns,
		});

		// Handle named input syntax: merge(node, { input0, input1, ... })
		if (isMergeNamedInputSyntax(composite)) {
			const namedMerge = composite as MergeComposite & {
				inputMapping: Map<number, NodeInstance<string, string, unknown>[]>;
				_allInputNodes: NodeInstance<string, string, unknown>[];
			};

			// Track the actual key each node was added under (may differ from node.name if renamed)
			const nodeActualKeys = new Map<NodeInstance<string, string, unknown>, string>();

			// Add all input nodes
			for (const inputNode of namedMerge._allInputNodes) {
				const actualKey = this.addBranchToGraph(nodes, inputNode);
				nodeActualKeys.set(inputNode, actualKey);
			}

			// Connect tail nodes to merge at their specified input indices
			// Skip connections that already exist (e.g., created by IF/Switch builders with correct output index)
			for (const [inputIndex, tailNodes] of namedMerge.inputMapping) {
				for (const tailNode of tailNodes) {
					// Use the actual key the node was added under, falling back to node.name
					const actualKey = nodeActualKeys.get(tailNode) ?? tailNode.name;
					const tailGraphNode = nodes.get(actualKey);
					if (tailGraphNode) {
						const tailMainConns = tailGraphNode.connections.get('main') || new Map();
						// Check all output indices for an existing connection to this merge at this input
						let connectionExists = false;
						for (const [, conns] of tailMainConns) {
							if (
								conns.some(
									(c: ConnectionTarget) =>
										c.node === composite.mergeNode.name && c.index === inputIndex,
								)
							) {
								connectionExists = true;
								break;
							}
						}
						if (!connectionExists) {
							// No existing connection found, create one at output 0
							const existingConns = tailMainConns.get(0) || [];
							tailMainConns.set(0, [
								...existingConns,
								{ node: composite.mergeNode.name, type: 'main', index: inputIndex },
							]);
							tailGraphNode.connections.set('main', tailMainConns);
						}
					}
				}
			}
			return;
		}

		// Original behavior: merge([branch1, branch2], config)
		// Add all branch nodes with connections TO the merge node at different input indices
		// Branches can be NodeInstance, NodeChain, or nested MergeComposite
		const branches = composite.branches;
		branches.forEach((branch, index) => {
			// Handle nested MergeComposite (from merge([merge([...]), ...]) pattern)
			if (this.isMergeComposite(branch)) {
				const nestedComposite = branch as unknown as MergeComposite<
					NodeInstance<string, string, unknown>[]
				>;
				// Recursively add the nested merge's nodes
				this.addMergeNodes(nodes, nestedComposite);

				// Connect the nested merge's output to this merge's input
				const nestedMergeNode = nodes.get(nestedComposite.mergeNode.name);
				if (nestedMergeNode) {
					const mainConns = nestedMergeNode.connections.get('main') || new Map();
					mainConns.set(0, [{ node: composite.mergeNode.name, type: 'main', index }]);
					nestedMergeNode.connections.set('main', mainConns);
				}
				return;
			}

			// Handle NodeChain branches
			if (isNodeChain(branch)) {
				// Add all nodes from the chain
				this.addBranchToGraph(nodes, branch);

				// Connect the tail of the chain to this merge
				const tailName = (branch as NodeChain).tail?.name;
				if (tailName) {
					const tailNode = nodes.get(tailName);
					if (tailNode) {
						const mainConns = tailNode.connections.get('main') || new Map();
						mainConns.set(0, [{ node: composite.mergeNode.name, type: 'main', index }]);
						tailNode.connections.set('main', mainConns);
					}
				}
				return;
			}

			// Regular node branch - use addNodeWithSubnodes to process any AI subnodes
			const branchNode = branch as NodeInstance<string, string, unknown>;
			this.addNodeWithSubnodes(nodes, branchNode);
			// Add the connection to the merge node
			const graphNode = nodes.get(branchNode.name);
			if (graphNode) {
				const mainConns = graphNode.connections.get('main') ?? new Map();
				mainConns.set(0, [{ node: composite.mergeNode.name, type: 'main', index }]);
				graphNode.connections.set('main', mainConns);
			}
		});
	}

	/**
	 * Add nodes from a SplitInBatches chain (EachChainImpl/DoneChainImpl) to the nodes map
	 * This handles the case where splitInBatches() is chained via node.then(splitInBatches()...)
	 * @param nameMapping - Optional map from node ID to actual map key (used when nodes are renamed)
	 */
	private addSplitInBatchesChainNodes(
		nodes: Map<string, GraphNode>,
		sibChain: unknown,
		nameMapping?: Map<string, string>,
	): void {
		const builder = this.extractSplitInBatchesBuilder(sibChain);

		// Check if we're already processing this builder (prevents infinite recursion)
		// This happens when onEachBatch chain loops back to the same SIB builder
		if (processingSibBuilders.has(builder)) {
			return;
		}
		processingSibBuilders.add(builder);

		// Add the split in batches node
		const sibConns = new Map<string, Map<number, ConnectionTarget[]>>();
		sibConns.set('main', new Map());
		nodes.set(builder.sibNode.name, {
			instance: builder.sibNode,
			connections: sibConns,
		});

		const sibGraphNode = nodes.get(builder.sibNode.name)!;
		const sibMainConns = sibGraphNode.connections.get('main') || new Map();

		// Create nameMapping if not passed (tracks node ID -> actual map key for renamed nodes)
		const effectiveNameMapping = nameMapping ?? new Map<string, string>();

		// Check if this is named syntax (has _doneTarget/_eachTarget)
		// Named syntax uses full branch targets instead of batches
		const hasNamedSyntax = '_doneTarget' in builder || '_eachTarget' in builder;

		if (hasNamedSyntax) {
			try {
				// Named syntax: splitInBatches(sibNode, { done: ..., each: ... })
				// Process done target (output 0)
				if (builder._doneTarget !== null && builder._doneTarget !== undefined) {
					const doneTarget = builder._doneTarget;
					// Handle array (fan-out) targets
					if (Array.isArray(doneTarget)) {
						for (const target of doneTarget) {
							const firstNodeName = this.addBranchToGraph(
								nodes,
								target as NodeInstance<string, string, unknown>,
								effectiveNameMapping,
							);
							const output0 = sibMainConns.get(0) || [];
							sibMainConns.set(0, [...output0, { node: firstNodeName, type: 'main', index: 0 }]);
						}
					} else {
						const firstNodeName = this.addBranchToGraph(
							nodes,
							doneTarget as NodeInstance<string, string, unknown>,
							effectiveNameMapping,
						);
						const output0 = sibMainConns.get(0) || [];
						sibMainConns.set(0, [...output0, { node: firstNodeName, type: 'main', index: 0 }]);
					}
				}

				// Process each target (output 1)
				if (builder._eachTarget !== null && builder._eachTarget !== undefined) {
					const eachTarget = builder._eachTarget;
					// Handle array (fan-out) targets
					if (Array.isArray(eachTarget)) {
						for (const target of eachTarget) {
							const firstNodeName = this.addBranchToGraph(
								nodes,
								target as NodeInstance<string, string, unknown>,
								effectiveNameMapping,
							);
							const output1 = sibMainConns.get(1) || [];
							sibMainConns.set(1, [...output1, { node: firstNodeName, type: 'main', index: 0 }]);
						}
					} else {
						const firstNodeName = this.addBranchToGraph(
							nodes,
							eachTarget as NodeInstance<string, string, unknown>,
							effectiveNameMapping,
						);
						const output1 = sibMainConns.get(1) || [];
						sibMainConns.set(1, [...output1, { node: firstNodeName, type: 'main', index: 0 }]);
					}
				}

				sibGraphNode.connections.set('main', sibMainConns);
				// Note: Named syntax doesn't use _hasLoop - loops are expressed in the target chain itself
			} finally {
				processingSibBuilders.delete(builder);
			}
			return;
		}

		// Fluent API: splitInBatches(sibNode).onDone(...).onEachBatch(...)
		try {
			// Process done chain batches (output 0)
			let prevDoneNode: string | null = null;
			for (const batch of builder._doneBatches) {
				if (Array.isArray(batch)) {
					// Fan-out: all nodes in the array connect to the same source
					for (const doneNode of batch) {
						const firstNodeName = this.addBranchToGraph(nodes, doneNode, effectiveNameMapping);
						if (prevDoneNode === null) {
							const output0 = sibMainConns.get(0) || [];
							sibMainConns.set(0, [...output0, { node: firstNodeName, type: 'main', index: 0 }]);
						} else {
							const prevGraphNode = nodes.get(prevDoneNode);
							if (prevGraphNode) {
								const prevMainConns = prevGraphNode.connections.get('main') || new Map();
								const existingConns = prevMainConns.get(0) || [];
								prevMainConns.set(0, [
									...existingConns,
									{ node: firstNodeName, type: 'main', index: 0 },
								]);
								prevGraphNode.connections.set('main', prevMainConns);
							}
						}
					}
				} else {
					const doneNode = batch;
					const firstNodeName = this.addBranchToGraph(nodes, doneNode, effectiveNameMapping);
					if (prevDoneNode === null) {
						const output0 = sibMainConns.get(0) || [];
						sibMainConns.set(0, [...output0, { node: firstNodeName, type: 'main', index: 0 }]);
					} else {
						const prevGraphNode = nodes.get(prevDoneNode);
						if (prevGraphNode) {
							const prevMainConns = prevGraphNode.connections.get('main') || new Map();
							const existingConns = prevMainConns.get(0) || [];
							prevMainConns.set(0, [
								...existingConns,
								{ node: firstNodeName, type: 'main', index: 0 },
							]);
							prevGraphNode.connections.set('main', prevMainConns);
						}
					}
					prevDoneNode = isNodeChain(doneNode)
						? (doneNode.tail?.name ?? firstNodeName)
						: firstNodeName;
				}
			}

			// Process each chain batches (output 1)
			let prevEachNode: string | null = null;
			for (const batch of builder._eachBatches) {
				if (Array.isArray(batch)) {
					// Fan-out: all nodes in the array connect to the same source
					for (const eachNode of batch) {
						const firstNodeName = this.addBranchToGraph(nodes, eachNode, effectiveNameMapping);
						if (prevEachNode === null) {
							const output1 = sibMainConns.get(1) || [];
							sibMainConns.set(1, [...output1, { node: firstNodeName, type: 'main', index: 0 }]);
						} else {
							const prevGraphNode = nodes.get(prevEachNode);
							if (prevGraphNode) {
								const prevMainConns = prevGraphNode.connections.get('main') || new Map();
								const existingConns = prevMainConns.get(0) || [];
								prevMainConns.set(0, [
									...existingConns,
									{ node: firstNodeName, type: 'main', index: 0 },
								]);
								prevGraphNode.connections.set('main', prevMainConns);
							}
						}
					}
				} else {
					const eachNode = batch;
					const firstNodeName = this.addBranchToGraph(nodes, eachNode, effectiveNameMapping);
					if (prevEachNode === null) {
						const output1 = sibMainConns.get(1) || [];
						sibMainConns.set(1, [...output1, { node: firstNodeName, type: 'main', index: 0 }]);
					} else {
						const prevGraphNode = nodes.get(prevEachNode);
						if (prevGraphNode) {
							const prevMainConns = prevGraphNode.connections.get('main') || new Map();
							const existingConns = prevMainConns.get(0) || [];
							prevMainConns.set(0, [
								...existingConns,
								{ node: firstNodeName, type: 'main', index: 0 },
							]);
							prevGraphNode.connections.set('main', prevMainConns);
						}
					}
					prevEachNode = isNodeChain(eachNode)
						? (eachNode.tail?.name ?? firstNodeName)
						: firstNodeName;
				}
			}

			sibGraphNode.connections.set('main', sibMainConns);

			// Add loop connection from last each node back to split in batches if hasLoop is true
			if (builder._hasLoop && prevEachNode) {
				const lastEachGraphNode = nodes.get(prevEachNode);
				if (lastEachGraphNode) {
					const lastEachMainConns = lastEachGraphNode.connections.get('main') || new Map();
					const existingConns = lastEachMainConns.get(0) || [];
					lastEachMainConns.set(0, [
						...existingConns,
						{ node: builder.sibNode.name, type: 'main', index: 0 },
					]);
					lastEachGraphNode.connections.set('main', lastEachMainConns);
				}
			}
		} finally {
			processingSibBuilders.delete(builder);
		}
	}

	/**
	 * Generate a unique node name if the name already exists
	 */
	private generateUniqueName(nodes: Map<string, GraphNode>, baseName: string): string {
		if (!nodes.has(baseName)) {
			return baseName;
		}

		// Find the next available number suffix
		let counter = 1;
		let newName = `${baseName} ${counter}`;
		while (nodes.has(newName)) {
			counter++;
			newName = `${baseName} ${counter}`;
		}
		return newName;
	}

	/**
	 * Add a node and its subnodes to the nodes map, creating AI connections.
	 * Returns the actual map key used (may differ from nodeInstance.name if renamed),
	 * or undefined if the node was skipped (invalid or duplicate reference).
	 */
	private addNodeWithSubnodes(
		nodes: Map<string, GraphNode>,
		nodeInstance: NodeInstance<string, string, unknown>,
	): string | undefined {
		// Guard against invalid node instances (e.g., empty objects from chain.allNodes)
		if (!nodeInstance || typeof nodeInstance !== 'object') {
			return undefined;
		}
		if (!nodeInstance.type || !nodeInstance.name) {
			// Not a valid node instance - skip silently
			return undefined;
		}

		// Check if this exact instance is already in the map under any key.
		// This is necessary because a node may have been renamed (e.g., "Format Response" -> "Format Response 1")
		// but the same instance reference appears multiple times in chain targets.
		for (const [key, graphNode] of nodes) {
			if (graphNode.instance === nodeInstance) {
				return key; // Already added, return the existing key
			}
		}

		// Check if a node with the same name already exists
		const existingNode = nodes.get(nodeInstance.name);
		if (existingNode) {
			// If it's the same node instance (by reference), skip - it's a duplicate reference
			if (existingNode.instance === nodeInstance) {
				return undefined;
			}
			// Different node instance with same name - generate unique name and add it
			// This handles the case where user creates multiple nodes with the same name
			const uniqueName = this.generateUniqueName(nodes, nodeInstance.name);
			const connectionsMap = new Map<string, Map<number, ConnectionTarget[]>>();
			connectionsMap.set('main', new Map());
			nodes.set(uniqueName, {
				instance: nodeInstance,
				connections: connectionsMap,
			});
			return uniqueName;
		}

		// Add the main node
		const connectionsMap = new Map<string, Map<number, ConnectionTarget[]>>();
		connectionsMap.set('main', new Map());
		nodes.set(nodeInstance.name, {
			instance: nodeInstance,
			connections: connectionsMap,
		});

		// Process subnodes if present
		const subnodes = nodeInstance.config?.subnodes as SubnodeConfig | undefined;
		if (!subnodes) return nodeInstance.name;

		// Helper to add a subnode with its AI connection (recursively handles nested subnodes)
		const addSubnode = (subnode: NodeInstance<string, string, unknown>, connectionType: string) => {
			const existingSubnode = nodes.get(subnode.name);

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
					{ node: nodeInstance.name, type: connectionType, index: 0 },
				]);
				return; // Don't process nested subnodes again - already done
			}

			// New subnode - add it with its connection
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

			// Recursively process any nested subnodes this subnode might have (only for new subnodes)
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

		// Add reranker subnode
		if (subnodes.reranker) {
			addSubnode(subnodes.reranker, 'ai_reranker');
		}

		return nodeInstance.name;
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
			const existingSubnode = nodes.get(subnode.name);

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
				return; // Don't process nested subnodes again - already done
			}

			// New subnode - add it with its connection
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

			// Recursively process any nested subnodes (only for new subnodes)
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
		if (subnodes.reranker) addNestedSubnode(subnodes.reranker, 'ai_reranker');
	}

	/**
	 * Handle fan-out pattern - connects current node to multiple target nodes
	 * Supports NodeChain targets (e.g., workflow.then([x1, fb, linkedin.then(sheets)]))
	 *
	 * For IF/Switch nodes, each array element maps to a different output index (branching).
	 * For regular nodes, all targets connect from the same output (fan-out).
	 */
	private handleFanOut<N extends NodeInstance<string, string, unknown>>(
		nodes: N[],
	): WorkflowBuilder {
		if (nodes.length === 0) {
			return this;
		}

		const newNodes = new Map(this._nodes);

		// Check if current node is an IF, Switch, or SplitInBatches node for branch-style connections
		// These nodes have multiple outputs where each array element maps to a different output index
		const currentGraphNode = this._currentNode ? newNodes.get(this._currentNode) : undefined;
		const isBranchingNode =
			currentGraphNode?.instance.type === 'n8n-nodes-base.if' ||
			currentGraphNode?.instance.type === 'n8n-nodes-base.switch' ||
			currentGraphNode?.instance.type === 'n8n-nodes-base.splitInBatches';

		// Add all target nodes and connect them to the current node
		nodes.forEach((node, index) => {
			// Skip null values (empty branches for IF/Switch/SplitInBatches outputs)
			// but preserve the index for correct output mapping
			if (node === null) {
				return;
			}

			// Use addBranchToGraph to handle NodeChains properly
			// This returns the head node name for connection
			const headNodeName = this.addBranchToGraph(newNodes, node);

			// Connect from current node to the head of this target (branch)
			if (this._currentNode && currentGraphNode) {
				const mainConns = currentGraphNode.connections.get('main') || new Map();
				// For IF/Switch/SplitInBatches nodes, each array element uses incrementing output index
				// For regular nodes, all targets use the same currentOutput (fan-out)
				const outputIndex = isBranchingNode ? index : this._currentOutput;
				const outputConnections = mainConns.get(outputIndex) || [];
				mainConns.set(outputIndex, [
					...outputConnections,
					{ node: headNodeName, type: 'main', index: 0 },
				]);
				currentGraphNode.connections.set('main', mainConns);
			}
		});

		// Set the last non-null node in the array as the current node (for continued chaining)
		// For NodeChains, use the tail node name (if tail is not null)
		const nonNullNodes = nodes.filter((n): n is NonNullable<typeof n> => n !== null);
		const lastNode = nonNullNodes[nonNullNodes.length - 1];
		const lastNodeName = lastNode
			? isNodeChain(lastNode)
				? (lastNode.tail?.name ?? this._currentNode)
				: lastNode.name
			: this._currentNode;

		return this.clone({
			nodes: newNodes,
			currentNode: lastNodeName,
			currentOutput: 0,
		});
	}

	/**
	 * Handle a NodeChain passed to workflow.then()
	 * This is used when chained node calls are passed directly, e.g., workflow.then(node().then().then())
	 */
	private handleNodeChain(chain: NodeChain): WorkflowBuilder {
		const newNodes = new Map(this._nodes);

		// Add the head node and connect from current workflow position
		const headNodeName = this.addBranchToGraph(newNodes, chain);

		// Check if the first element in allNodes is a merge composite with named input syntax
		// If so, we need to fan out to the input heads instead of connecting to the merge node directly
		const firstNode = chain.allNodes[0];
		const firstNodeAsMerge = this.isMergeComposite(firstNode)
			? (firstNode as unknown as MergeComposite<NodeInstance<string, string, unknown>[]>)
			: null;
		const hasMergeNamedInputs = firstNodeAsMerge && isMergeNamedInputSyntax(firstNodeAsMerge);

		// Connect from current workflow node to the head of the chain
		if (this._currentNode) {
			const currentGraphNode = newNodes.get(this._currentNode);
			if (currentGraphNode) {
				const mainConns = currentGraphNode.connections.get('main') || new Map();
				const outputConnections = mainConns.get(this._currentOutput) || [];

				if (hasMergeNamedInputs && firstNodeAsMerge) {
					// Fan out to all input heads for named input merge syntax
					for (const headNode of firstNodeAsMerge.branches) {
						const inputHeadName = isNodeChain(headNode) ? headNode.head.name : headNode.name;
						// Avoid duplicates
						if (!outputConnections.some((c: ConnectionTarget) => c.node === inputHeadName)) {
							outputConnections.push({ node: inputHeadName, type: 'main', index: 0 });
						}
					}
				} else {
					// Standard behavior: connect to chain head
					outputConnections.push({ node: headNodeName, type: 'main', index: 0 });
				}

				mainConns.set(this._currentOutput, outputConnections);
				currentGraphNode.connections.set('main', mainConns);
			}
		}

		// Collect pinData from the chain
		const chainPinData = this.collectPinDataFromChain(chain);

		// Set current node to the tail of the chain
		const tailName = chain.tail?.name ?? headNodeName;

		return this.clone({
			nodes: newNodes,
			currentNode: tailName,
			currentOutput: 0,
			pinData: chainPinData,
		});
	}

	/**
	 * Handle merge composite - creates parallel branches that merge
	 */
	private handleMergeComposite(
		mergeComposite: MergeComposite<NodeInstance<string, string, unknown>[]>,
	): WorkflowBuilder {
		const newNodes = new Map(this._nodes);

		// Handle named input syntax: merge(node, { input0, input1, ... })
		if (isMergeNamedInputSyntax(mergeComposite)) {
			const namedMerge = mergeComposite as MergeComposite & {
				inputMapping: Map<number, NodeInstance<string, string, unknown>[]>;
				_allInputNodes: NodeInstance<string, string, unknown>[];
			};

			// Add all input nodes first
			for (const inputNode of namedMerge._allInputNodes) {
				this.addBranchToGraph(newNodes, inputNode);
			}

			// Connect from current node to all input heads (entry points)
			if (this._currentNode) {
				const currentGraphNode = newNodes.get(this._currentNode);
				if (currentGraphNode) {
					const mainConns = currentGraphNode.connections.get('main') || new Map();
					const outputConnections = mainConns.get(this._currentOutput) || [];

					// Get unique head nodes from branches array
					for (const headNode of mergeComposite.branches) {
						const headName = isNodeChain(headNode) ? headNode.head.name : headNode.name;
						// Avoid duplicates
						if (!outputConnections.some((c: ConnectionTarget) => c.node === headName)) {
							outputConnections.push({ node: headName, type: 'main', index: 0 });
						}
					}
					mainConns.set(this._currentOutput, outputConnections);
					currentGraphNode.connections.set('main', mainConns);
				}
			}

			// Connect tail nodes to merge at their specified input indices
			for (const [inputIndex, tailNodes] of namedMerge.inputMapping) {
				for (const tailNode of tailNodes) {
					const tailGraphNode = newNodes.get(tailNode.name);
					if (tailGraphNode) {
						const tailMainConns = tailGraphNode.connections.get('main') || new Map();
						const existingConns = tailMainConns.get(0) || [];
						tailMainConns.set(0, [
							...existingConns,
							{ node: mergeComposite.mergeNode.name, type: 'main', index: inputIndex },
						]);
						tailGraphNode.connections.set('main', tailMainConns);
					}
				}
			}

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

		// Original behavior: merge([branch1, branch2], config)
		const branches = mergeComposite.branches as NodeInstance<string, string, unknown>[];

		// Add all branch nodes (with subnodes) with correct input index connections
		branches.forEach((branchNode, branchIndex) => {
			// Use addBranchToGraph to properly handle NodeChains
			// It returns the HEAD node name (entry point of the branch)
			const headNodeName = this.addBranchToGraph(newNodes, branchNode);

			// Connect from current node to the HEAD of each branch
			if (this._currentNode) {
				const currentGraphNode = newNodes.get(this._currentNode);
				if (currentGraphNode) {
					const mainConns = currentGraphNode.connections.get('main') || new Map();
					const outputConnections = mainConns.get(this._currentOutput) || [];
					mainConns.set(this._currentOutput, [
						...outputConnections,
						{ node: headNodeName, type: 'main', index: 0 },
					]);
					currentGraphNode.connections.set('main', mainConns);
				}
			}

			// Connect the TAIL of each branch to the merge node at the correct INPUT INDEX
			// For NodeChains, tail is the last node; for single nodes, it's the node itself
			// Handle case where tail could be null (from [null, node] array syntax)
			const tailNodeName = isNodeChain(branchNode) ? branchNode.tail?.name : branchNode.name;
			if (!tailNodeName) {
				return; // Skip branches with null tail
			}
			const tailGraphNode = newNodes.get(tailNodeName)!;
			const tailMainConns = tailGraphNode.connections.get('main') || new Map();
			tailMainConns.set(0, [
				{ node: mergeComposite.mergeNode.name, type: 'main', index: branchIndex },
			]);
			tailGraphNode.connections.set('main', tailMainConns);
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
	 * @param nameMapping - Optional map from node ID to actual map key (used when nodes are renamed)
	 */
	private addBranchToGraph(
		nodes: Map<string, GraphNode>,
		branch: NodeInstance<string, string, unknown>,
		nameMapping?: Map<string, string>,
	): string {
		// Create nameMapping if not passed (tracks node ID -> actual map key for renamed nodes)
		const effectiveNameMapping = nameMapping ?? new Map<string, string>();

		// Handle IfElseBuilder (fluent API) - add via addIfElseBuilderNodes
		if (isIfElseBuilder(branch)) {
			const builder = branch as unknown as IfElseBuilder<unknown>;
			if (!nodes.has(builder.ifNode.name)) {
				this.addIfElseBuilderNodes(nodes, builder);
			}
			return builder.ifNode.name;
		}

		// Handle SwitchCaseBuilder (fluent API) - add via addSwitchCaseBuilderNodes
		if (isSwitchCaseBuilder(branch)) {
			const builder = branch as unknown as SwitchCaseBuilder<unknown>;
			if (!nodes.has(builder.switchNode.name)) {
				this.addSwitchCaseBuilderNodes(nodes, builder);
			}
			return builder.switchNode.name;
		}

		// Check if the branch is a NodeChain
		if (isNodeChain(branch)) {
			// Add all nodes from the chain, handling composites that may have been chained
			for (const chainNode of branch.allNodes) {
				// Skip null values (can occur when .then([null, node]) is used)
				if (chainNode === null) {
					continue;
				}

				// Skip invalid objects that aren't valid nodes or composites
				if (
					typeof chainNode !== 'object' ||
					(!('name' in chainNode) &&
						!this.isSwitchCaseComposite(chainNode) &&
						!this.isIfElseComposite(chainNode) &&
						!this.isMergeComposite(chainNode) &&
						!this.isSplitInBatchesBuilder(chainNode) &&
						!isIfElseBuilder(chainNode) &&
						!isSwitchCaseBuilder(chainNode))
				) {
					continue;
				}

				// Check for builders FIRST (before composites) - builders have similar properties
				if (isIfElseBuilder(chainNode)) {
					// Handle IfElseBuilder (fluent API) chained via chain.then(ifNode.onTrue(...).onFalse(...))
					this.addIfElseBuilderNodes(nodes, chainNode as unknown as IfElseBuilder<unknown>);
				} else if (isSwitchCaseBuilder(chainNode)) {
					// Handle SwitchCaseBuilder (fluent API) chained via chain.then(switchNode.onCase(...))
					this.addSwitchCaseBuilderNodes(nodes, chainNode as unknown as SwitchCaseBuilder<unknown>);
				} else if (this.isSwitchCaseComposite(chainNode)) {
					this.addSwitchCaseNodes(nodes, chainNode as unknown as SwitchCaseComposite);
				} else if (this.isIfElseComposite(chainNode)) {
					this.addIfElseNodes(nodes, chainNode as unknown as IfElseComposite);
				} else if (this.isMergeComposite(chainNode)) {
					this.addMergeNodes(
						nodes,
						chainNode as unknown as MergeComposite<NodeInstance<string, string, unknown>[]>,
					);
				} else if (this.isSplitInBatchesBuilder(chainNode)) {
					// Handle EachChainImpl/DoneChainImpl that got chained via node.then(splitInBatches()...)
					this.addSplitInBatchesChainNodes(nodes, chainNode, effectiveNameMapping);
				} else {
					const actualKey = this.addNodeWithSubnodes(nodes, chainNode);
					// Track the actual key if it was renamed
					if (actualKey && actualKey !== chainNode.name) {
						effectiveNameMapping.set(chainNode.id, actualKey);
					}
				}
			}

			// Process connections declared on the chain (from .then() calls)
			const connections = branch.getConnections();
			for (const { target, outputIndex, targetInputIndex } of connections) {
				// Find the source node in the chain that declared this connection
				// by looking for the node whose .then() was called
				for (const chainNode of branch.allNodes) {
					// Skip null values (from array syntax like [null, node])
					if (chainNode === null) {
						continue;
					}

					// Get the actual node instance that might have connections
					// For MergeComposite, we need to check the mergeNode inside it
					// For SplitInBatchesBuilder, skip - connections to SIB are handled differently
					let nodeToCheck: NodeInstance<string, string, unknown> | null = null;
					let nodeName: string | null = null;

					if (this.isSplitInBatchesBuilder(chainNode)) {
						// SplitInBatchesBuilder doesn't have getConnections - skip
						continue;
					} else if (this.isMergeComposite(chainNode)) {
						const composite = chainNode as unknown as MergeComposite<
							NodeInstance<string, string, unknown>[]
						>;
						nodeToCheck = composite.mergeNode;
						nodeName = composite.mergeNode.name;
					} else if (typeof chainNode.getConnections === 'function') {
						nodeToCheck = chainNode;
						nodeName = chainNode.name;
					}

					if (nodeToCheck && nodeName && typeof nodeToCheck.getConnections === 'function') {
						const nodeConns = nodeToCheck.getConnections();
						if (nodeConns.some((c) => c.target === target && c.outputIndex === outputIndex)) {
							// This chain node declared this connection
							// First, ensure target nodes are added to the graph (e.g., error handler chains)
							if (isNodeChain(target)) {
								const chainTarget = target as NodeChain;
								// Add each node in the chain that isn't already in the map
								// We can't just check the head because the chain may reuse an existing
								// node as head (e.g., set_content) while having new nodes after it
								for (const chainNode of chainTarget.allNodes) {
									if (chainNode === null) continue;

									// Check for builders FIRST (before composites) - builders have similar properties
									if (isIfElseBuilder(chainNode)) {
										const builder = chainNode as unknown as IfElseBuilder<unknown>;
										if (!nodes.has(builder.ifNode.name)) {
											this.addIfElseBuilderNodes(nodes, builder);
										}
									} else if (isSwitchCaseBuilder(chainNode)) {
										const builder = chainNode as unknown as SwitchCaseBuilder<unknown>;
										if (!nodes.has(builder.switchNode.name)) {
											this.addSwitchCaseBuilderNodes(nodes, builder);
										}
									} else if (this.isSwitchCaseComposite(chainNode)) {
										const comp = chainNode as unknown as SwitchCaseComposite;
										if (!nodes.has(comp.switchNode.name)) {
											this.addSwitchCaseNodes(nodes, comp);
										}
									} else if (this.isIfElseComposite(chainNode)) {
										const comp = chainNode as unknown as IfElseComposite;
										// Add the IF node first to mark as processed (prevents recursion)
										if (!nodes.has(comp.ifNode.name)) {
											// Pre-register IF node to prevent recursion during branch processing
											const ifConns = new Map<string, Map<number, ConnectionTarget[]>>();
											ifConns.set('main', new Map());
											nodes.set(comp.ifNode.name, {
												instance: comp.ifNode,
												connections: ifConns,
											});
											// Now process branches safely
											this.addIfElseNodes(nodes, comp);
										}
									} else if (this.isMergeComposite(chainNode)) {
										const comp = chainNode as unknown as MergeComposite<
											NodeInstance<string, string, unknown>[]
										>;
										if (!nodes.has(comp.mergeNode.name)) {
											this.addMergeNodes(nodes, comp);
										}
									} else if (this.isSplitInBatchesBuilder(chainNode)) {
										const builder = this.extractSplitInBatchesBuilder(chainNode);
										if (!nodes.has(builder.sibNode.name)) {
											this.addSplitInBatchesChainNodes(nodes, chainNode);
										}
									} else if (!nodes.has(chainNode.name)) {
										// Add regular node if not already present
										this.addNodeWithSubnodes(nodes, chainNode);
									}
								}
							} else if (
								typeof (target as NodeInstance<string, string, unknown>).name === 'string' &&
								!nodes.has((target as NodeInstance<string, string, unknown>).name)
							) {
								this.addNodeWithSubnodes(nodes, target as NodeInstance<string, string, unknown>);
							}

							// Use the effectiveNameMapping to get the actual key if the node was renamed
							const mappedKey = nodeToCheck && effectiveNameMapping.get(nodeToCheck.id);
							const actualSourceKey = mappedKey ?? nodeName;
							const sourceGraphNode = nodes.get(actualSourceKey!);
							if (sourceGraphNode) {
								const targetName = this.resolveTargetNodeName(target, effectiveNameMapping);
								if (targetName) {
									const mainConns = sourceGraphNode.connections.get('main') || new Map();
									const outputConns = mainConns.get(outputIndex) || [];
									if (!outputConns.some((c: ConnectionTarget) => c.node === targetName)) {
										outputConns.push({
											node: targetName,
											type: 'main',
											index: targetInputIndex ?? 0,
										});
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
			// Use effectiveNameMapping to get the actual key if the head was renamed
			const headKey = effectiveNameMapping.get(branch.head.id) ?? branch.head.name;
			return headKey;
		} else {
			// Check if this is a composite that needs special handling
			if (this.isSwitchCaseComposite(branch)) {
				this.addSwitchCaseNodes(nodes, branch as unknown as SwitchCaseComposite);
				// Return the switch node name (the head of this composite)
				return (branch as unknown as SwitchCaseComposite).switchNode.name;
			} else if (this.isIfElseComposite(branch)) {
				this.addIfElseNodes(nodes, branch as unknown as IfElseComposite);
				// Return the IF node name (the head of this composite)
				return (branch as unknown as IfElseComposite).ifNode.name;
			} else if (this.isMergeComposite(branch)) {
				this.addMergeNodes(
					nodes,
					branch as unknown as MergeComposite<NodeInstance<string, string, unknown>[]>,
				);
				// Return the merge node name (the head of this composite)
				return (branch as unknown as MergeComposite<NodeInstance<string, string, unknown>[]>)
					.mergeNode.name;
			} else if (this.isSplitInBatchesBuilder(branch)) {
				this.addSplitInBatchesChainNodes(nodes, branch, effectiveNameMapping);
				// Return the split in batches node name
				const builder = this.extractSplitInBatchesBuilder(branch);
				return builder.sibNode.name;
			}

			// Single node - add it and return its name
			const actualKey = this.addNodeWithSubnodes(nodes, branch);
			// If the node was renamed, track it and return the actual key
			if (actualKey && actualKey !== branch.name) {
				effectiveNameMapping.set(branch.id, actualKey);
			}
			return actualKey ?? branch.name;
		}
	}

	/**
	 * Handle IF branch composite - creates IF node with true/false branches
	 * Supports null branches for single-branch patterns
	 * Handles NodeChain branches (nodes with .then() chains)
	 * Supports array branches for fan-out patterns (one output to multiple parallel nodes)
	 */
	private handleIfElseComposite(composite: IfElseComposite): WorkflowBuilder {
		const newNodes = new Map(this._nodes);
		const ifMainConns = new Map<number, ConnectionTarget[]>();

		// Add true branch (may be NodeChain with downstream nodes, or array for fan-out)
		if (composite.trueBranch) {
			if (Array.isArray(composite.trueBranch)) {
				// Fan-out: multiple parallel targets from trueBranch
				const targets: ConnectionTarget[] = [];
				for (const branchNode of composite.trueBranch) {
					const branchHead = this.addBranchToGraph(newNodes, branchNode);
					targets.push({ node: branchHead, type: 'main', index: 0 });
				}
				ifMainConns.set(0, targets);
			} else {
				const trueBranchHead = this.addBranchToGraph(newNodes, composite.trueBranch);
				ifMainConns.set(0, [{ node: trueBranchHead, type: 'main', index: 0 }]);
			}
		}

		// Add false branch (may be NodeChain with downstream nodes, or array for fan-out)
		if (composite.falseBranch) {
			if (Array.isArray(composite.falseBranch)) {
				// Fan-out: multiple parallel targets from falseBranch
				const targets: ConnectionTarget[] = [];
				for (const branchNode of composite.falseBranch) {
					const branchHead = this.addBranchToGraph(newNodes, branchNode);
					targets.push({ node: branchHead, type: 'main', index: 0 });
				}
				ifMainConns.set(1, targets);
			} else {
				const falseBranchHead = this.addBranchToGraph(newNodes, composite.falseBranch);
				ifMainConns.set(1, [{ node: falseBranchHead, type: 'main', index: 0 }]);
			}
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
	 * Handle IfElseBuilder (fluent API) - creates IF node with true/false branches
	 * This is the new fluent syntax: ifNode.onTrue(x).onFalse(y)
	 */
	private handleIfElseBuilder(builder: IfElseBuilder<unknown>): WorkflowBuilder {
		const newNodes = new Map(this._nodes);
		const ifMainConns = new Map<number, ConnectionTarget[]>();

		// IMPORTANT: Build IF connections BEFORE adding branch nodes
		// This ensures that when addMergeNodes runs, it can detect existing IF→Merge connections
		// and skip creating duplicates at the wrong output index

		// Connect IF to true branch at output 0
		// Always create connections - the IF builder knows the correct output index
		const trueBranch = builder.trueBranch;
		if (trueBranch !== null) {
			if (Array.isArray(trueBranch)) {
				// Fan-out: multiple targets from true branch
				const targets: ConnectionTarget[] = [];
				for (const t of trueBranch) {
					const targetName = this.getTargetNodeName(t);
					if (targetName) {
						// For merge targets, use the input index from the merge's named inputs if available
						const targetInputIndex = this.getMergeInputIndexForSource(builder.ifNode, t) ?? 0;
						targets.push({ node: targetName, type: 'main', index: targetInputIndex });
					}
				}
				if (targets.length > 0) {
					ifMainConns.set(0, targets);
				}
			} else {
				// Single target
				const targetName = this.getTargetNodeName(trueBranch);
				if (targetName) {
					// For merge targets, use the input index from the merge's named inputs if available
					const targetInputIndex =
						this.getMergeInputIndexForSource(builder.ifNode, trueBranch) ?? 0;
					ifMainConns.set(0, [{ node: targetName, type: 'main', index: targetInputIndex }]);
				}
			}
		}

		// Connect IF to false branch at output 1
		// Always create connections - the IF builder knows the correct output index
		const falseBranch = builder.falseBranch;
		if (falseBranch !== null) {
			if (Array.isArray(falseBranch)) {
				// Fan-out: multiple targets from false branch
				const targets: ConnectionTarget[] = [];
				for (const t of falseBranch) {
					const targetName = this.getTargetNodeName(t);
					if (targetName) {
						// For merge targets, use the input index from the merge's named inputs if available
						const targetInputIndex = this.getMergeInputIndexForSource(builder.ifNode, t) ?? 0;
						targets.push({ node: targetName, type: 'main', index: targetInputIndex });
					}
				}
				if (targets.length > 0) {
					ifMainConns.set(1, targets);
				}
			} else {
				// Single target
				const targetName = this.getTargetNodeName(falseBranch);
				if (targetName) {
					// For merge targets, use the input index from the merge's named inputs if available
					const targetInputIndex =
						this.getMergeInputIndexForSource(builder.ifNode, falseBranch) ?? 0;
					ifMainConns.set(1, [{ node: targetName, type: 'main', index: targetInputIndex }]);
				}
			}
		}

		// Add IF node with connections to present branches
		const ifConns = new Map<string, Map<number, ConnectionTarget[]>>();
		ifConns.set('main', ifMainConns);
		newNodes.set(builder.ifNode.name, {
			instance: builder.ifNode,
			connections: ifConns,
		});

		// NOW add branch nodes - this must happen AFTER IF node is added with its connections
		// so that addMergeNodes can detect existing IF→Merge connections and skip duplicates
		this.addBranchTargetNodes(newNodes, builder.trueBranch);
		this.addBranchTargetNodes(newNodes, builder.falseBranch);

		// Connect current node to IF node
		if (this._currentNode) {
			const currentGraphNode = newNodes.get(this._currentNode);
			if (currentGraphNode) {
				const mainConns = currentGraphNode.connections.get('main') || new Map();
				const outputConns = mainConns.get(this._currentOutput) || [];
				outputConns.push({ node: builder.ifNode.name, type: 'main', index: 0 });
				mainConns.set(this._currentOutput, outputConns);
				currentGraphNode.connections.set('main', mainConns);
			}
		}

		return this.clone({
			nodes: newNodes,
			currentNode: builder.ifNode.name,
			currentOutput: 0,
		});
	}

	/**
	 * Handle SwitchCaseBuilder (fluent API) - creates Switch node with case outputs
	 * This is the new fluent syntax: switchNode.onCase(0, x).onCase(1, y)
	 */
	private handleSwitchCaseBuilder(builder: SwitchCaseBuilder<unknown>): WorkflowBuilder {
		const newNodes = new Map(this._nodes);
		const switchConns = new Map<string, Map<number, ConnectionTarget[]>>();
		const mainConns = new Map<number, ConnectionTarget[]>();

		// IMPORTANT: Build Switch connections BEFORE adding case nodes
		// This ensures that when addMergeNodes runs, it can detect existing Switch→Merge connections
		// and skip creating duplicates at the wrong output index

		// Connect switch to each case at the correct output index
		// Always create connections - the Switch builder knows the correct output index
		for (const [caseIndex, target] of builder.caseMapping) {
			if (target === null) continue; // Skip null cases

			if (Array.isArray(target)) {
				// Fan-out: multiple targets from one case
				const targets: ConnectionTarget[] = [];
				for (const t of target) {
					const targetName = this.getTargetNodeName(t);
					if (targetName) {
						// For merge targets, use the input index from the merge's named inputs if available
						const targetInputIndex = this.getMergeInputIndexForSource(builder.switchNode, t) ?? 0;
						targets.push({ node: targetName, type: 'main', index: targetInputIndex });
					}
				}
				if (targets.length > 0) {
					mainConns.set(caseIndex, targets);
				}
			} else {
				// Single target
				const targetName = this.getTargetNodeName(target);
				if (targetName) {
					// For merge targets, use the input index from the merge's named inputs if available
					const targetInputIndex =
						this.getMergeInputIndexForSource(builder.switchNode, target) ?? 0;
					mainConns.set(caseIndex, [{ node: targetName, type: 'main', index: targetInputIndex }]);
				}
			}
		}

		// Add Switch node with all case connections
		switchConns.set('main', mainConns);
		newNodes.set(builder.switchNode.name, {
			instance: builder.switchNode,
			connections: switchConns,
		});

		// NOW add case nodes - this must happen AFTER Switch node is added with its connections
		// so that addMergeNodes can detect existing Switch→Merge connections and skip duplicates
		for (const [, target] of builder.caseMapping) {
			this.addBranchTargetNodes(newNodes, target);
		}

		// Connect current node to Switch node
		if (this._currentNode) {
			const currentGraphNode = newNodes.get(this._currentNode);
			if (currentGraphNode) {
				const currentMainConns = currentGraphNode.connections.get('main') || new Map();
				const outputConns = currentMainConns.get(this._currentOutput) || [];
				outputConns.push({ node: builder.switchNode.name, type: 'main', index: 0 });
				currentMainConns.set(this._currentOutput, outputConns);
				currentGraphNode.connections.set('main', currentMainConns);
			}
		}

		return this.clone({
			nodes: newNodes,
			currentNode: builder.switchNode.name,
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
		// Skip null cases (unconnected outputs)
		// Handle arrays for fan-out (one output to multiple parallel nodes)
		composite.cases.forEach((caseNode, index) => {
			if (caseNode === null) {
				return; // Skip null cases - no connection for this output
			}

			// Check if caseNode is an array (fan-out pattern)
			if (Array.isArray(caseNode)) {
				// Fan-out: multiple parallel targets from this case
				const targets: ConnectionTarget[] = [];
				for (const branchNode of caseNode) {
					if (branchNode === null) continue;
					const branchHead = this.addBranchToGraph(newNodes, branchNode);
					targets.push({ node: branchHead, type: 'main', index: 0 });
				}
				if (targets.length > 0) {
					mainConns.set(index, targets);
				}
			} else {
				const caseHeadName = this.addBranchToGraph(newNodes, caseNode);
				mainConns.set(index, [{ node: caseHeadName, type: 'main', index: 0 }]);
			}
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

		// Check if this is named syntax (has _doneTarget/_eachTarget)
		// Named syntax stores the full chain in _doneTarget/_eachTarget, while _doneBatches/_eachBatches
		// only contain the first node for backwards compatibility
		const hasNamedSyntax = '_doneTarget' in builder || '_eachTarget' in builder;

		if (hasNamedSyntax) {
			// Named syntax: splitInBatches(sibNode, { done: ..., each: ... })
			// Process done target (output 0)
			if (builder._doneTarget !== null && builder._doneTarget !== undefined) {
				const doneTarget = builder._doneTarget;
				// Handle array (fan-out) targets
				if (Array.isArray(doneTarget)) {
					for (const target of doneTarget) {
						const firstNodeName = this.addBranchToGraph(newNodes, target);
						const output0 = sibMainConns.get(0) || [];
						sibMainConns.set(0, [...output0, { node: firstNodeName, type: 'main', index: 0 }]);
					}
				} else {
					const firstNodeName = this.addBranchToGraph(
						newNodes,
						doneTarget as NodeInstance<string, string, unknown>,
					);
					const output0 = sibMainConns.get(0) || [];
					sibMainConns.set(0, [...output0, { node: firstNodeName, type: 'main', index: 0 }]);
				}
			}

			// Process each target (output 1)
			if (builder._eachTarget !== null && builder._eachTarget !== undefined) {
				const eachTarget = builder._eachTarget;
				// Handle array (fan-out) targets
				if (Array.isArray(eachTarget)) {
					for (const target of eachTarget) {
						const firstNodeName = this.addBranchToGraph(newNodes, target);
						const output1 = sibMainConns.get(1) || [];
						sibMainConns.set(1, [...output1, { node: firstNodeName, type: 'main', index: 0 }]);
					}
				} else {
					const firstNodeName = this.addBranchToGraph(
						newNodes,
						eachTarget as NodeInstance<string, string, unknown>,
					);
					const output1 = sibMainConns.get(1) || [];
					sibMainConns.set(1, [...output1, { node: firstNodeName, type: 'main', index: 0 }]);
				}
			}

			sibGraphNode.connections.set('main', sibMainConns);

			return this.clone({
				nodes: newNodes,
				currentNode: builder.sibNode.name,
				currentOutput: 0,
			});
		}

		// Fluent API: splitInBatches(sibNode).onDone(...).onEachBatch(...)
		// Process done chain batches (output 0)
		// Batches preserve array structure for fan-out detection
		let prevDoneNode: string | null = null;
		for (const batch of builder._doneBatches) {
			if (Array.isArray(batch)) {
				// Fan-out: all nodes in the array connect to the same source
				for (const doneNode of batch) {
					const firstNodeName = this.addBranchToGraph(newNodes, doneNode);
					if (prevDoneNode === null) {
						// All nodes in array connect to output 0 of split in batches
						const output0 = sibMainConns.get(0) || [];
						sibMainConns.set(0, [...output0, { node: firstNodeName, type: 'main', index: 0 }]);
					} else {
						// All nodes in array connect to the previous node
						const prevGraphNode = newNodes.get(prevDoneNode);
						if (prevGraphNode) {
							const prevMainConns = prevGraphNode.connections.get('main') || new Map();
							const existingConns = prevMainConns.get(0) || [];
							prevMainConns.set(0, [
								...existingConns,
								{ node: firstNodeName, type: 'main', index: 0 },
							]);
							prevGraphNode.connections.set('main', prevMainConns);
						}
					}
				}
				// For arrays, don't update prevDoneNode - subsequent single nodes will chain from SIB or prev
				// This matches the semantics of .onDone([a, b]) with subsequent single nodes - invalid usage
				// For valid cases like .onDone(fanOut(a.then(c), b.then(c))), the tails are merged elsewhere
			} else {
				// Single node: chain to previous or connect to output 0
				const doneNode = batch;
				const firstNodeName = this.addBranchToGraph(newNodes, doneNode);
				if (prevDoneNode === null) {
					const output0 = sibMainConns.get(0) || [];
					sibMainConns.set(0, [...output0, { node: firstNodeName, type: 'main', index: 0 }]);
				} else {
					const prevGraphNode = newNodes.get(prevDoneNode);
					if (prevGraphNode) {
						const prevMainConns = prevGraphNode.connections.get('main') || new Map();
						const existingConns = prevMainConns.get(0) || [];
						prevMainConns.set(0, [
							...existingConns,
							{ node: firstNodeName, type: 'main', index: 0 },
						]);
						prevGraphNode.connections.set('main', prevMainConns);
					}
				}
				prevDoneNode = isNodeChain(doneNode)
					? (doneNode.tail?.name ?? firstNodeName)
					: firstNodeName;
			}
		}

		// Process each chain batches (output 1)
		let prevEachNode: string | null = null;
		for (const batch of builder._eachBatches) {
			if (Array.isArray(batch)) {
				// Fan-out: all nodes in the array connect to the same source
				for (const eachNode of batch) {
					const firstNodeName = this.addBranchToGraph(newNodes, eachNode);
					if (prevEachNode === null) {
						const output1 = sibMainConns.get(1) || [];
						sibMainConns.set(1, [...output1, { node: firstNodeName, type: 'main', index: 0 }]);
					} else {
						const prevGraphNode = newNodes.get(prevEachNode);
						if (prevGraphNode) {
							const prevMainConns = prevGraphNode.connections.get('main') || new Map();
							const existingConns = prevMainConns.get(0) || [];
							prevMainConns.set(0, [
								...existingConns,
								{ node: firstNodeName, type: 'main', index: 0 },
							]);
							prevGraphNode.connections.set('main', prevMainConns);
						}
					}
				}
				// Don't update prevEachNode for arrays - maintain fan-out semantics
			} else {
				// Single node: chain to previous or connect to output 1
				const eachNode = batch;
				const firstNodeName = this.addBranchToGraph(newNodes, eachNode);
				if (prevEachNode === null) {
					const output1 = sibMainConns.get(1) || [];
					sibMainConns.set(1, [...output1, { node: firstNodeName, type: 'main', index: 0 }]);
				} else {
					const prevGraphNode = newNodes.get(prevEachNode);
					if (prevGraphNode) {
						const prevMainConns = prevGraphNode.connections.get('main') || new Map();
						const existingConns = prevMainConns.get(0) || [];
						prevMainConns.set(0, [
							...existingConns,
							{ node: firstNodeName, type: 'main', index: 0 },
						]);
						prevGraphNode.connections.set('main', prevMainConns);
					}
				}
				prevEachNode = isNodeChain(eachNode)
					? (eachNode.tail?.name ?? firstNodeName)
					: firstNodeName;
			}
		}

		sibGraphNode.connections.set('main', sibMainConns);

		// Handle loop - connect last each node back to split in batches
		// Skip if prevEachNode is the sibNode itself - the loop is already in the chain
		if (builder._hasLoop && prevEachNode && prevEachNode !== builder.sibNode.name) {
			const lastEachGraphNode = newNodes.get(prevEachNode);
			if (lastEachGraphNode) {
				const lastMainConns = lastEachGraphNode.connections.get('main') || new Map();
				const existingConns = lastMainConns.get(0) || [];
				// Preserve existing connections and add the loop connection
				lastMainConns.set(0, [
					...existingConns,
					{ node: builder.sibNode.name, type: 'main', index: 0 },
				]);
				lastEachGraphNode.connections.set('main', lastMainConns);
			}
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

		// Preserve original credentials exactly - don't transform
		// Some workflows have empty placeholder credentials like {}
		const credentials = n8nNode.credentials
			? (JSON.parse(JSON.stringify(n8nNode.credentials)) as Record<
					string,
					CredentialReference | NewCredentialValue
				>)
			: undefined;

		// Create a minimal node instance
		// For nodes without a name (like sticky notes), use the id as the internal name
		// but preserve the original name (or lack thereof) for export
		const nodeName = n8nNode.name ?? n8nNode.id;
		const instance: NodeInstance<string, string, unknown> = {
			type: n8nNode.type,
			version,
			id: n8nNode.id,
			name: nodeName,
			config: {
				name: nodeName, // Include name in config for consistency
				parameters: n8nNode.parameters as IDataObject,
				credentials,
				// Store original name to preserve it in toJSON (undefined for sticky notes without name)
				// Using spread to add internal property without polluting the type
				...({ _originalName: n8nNode.name } as Record<string, unknown>),
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
			to: function () {
				throw new Error('Nodes from fromJSON() do not support to() - use workflow builder methods');
			},
			input: function () {
				throw new Error(
					'Nodes from fromJSON() do not support input() - use workflow builder methods',
				);
			},
			output: function () {
				throw new Error(
					'Nodes from fromJSON() do not support output() - use workflow builder methods',
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
		// Always add to nameToKey since we now have a valid nodeName
		nameToKey.set(nodeName, mapKey);

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
