import type {
	WorkflowBuilder,
	WorkflowBuilderStatic,
	WorkflowSettings,
	WorkflowJSON,
	NodeInstance,
	ConnectionTarget,
	GraphNode,
	IDataObject,
	NodeChain,
	GeneratePinDataOptions,
	WorkflowBuilderOptions,
} from './types/base';
import { isNodeChain } from './types/base';
import type { ValidationOptions, ValidationResult, ValidationErrorCode } from './validation/index';
import { ValidationError, ValidationWarning } from './validation/index';
import { resolveTargetNodeName as resolveTargetNodeNameUtil } from './workflow-builder/connection-utils';
import { isInputTarget, cloneNodeWithId } from './workflow-builder/node-builders/node-builder';
import { shouldGeneratePinData } from './workflow-builder/pin-data-utils';
import { registerDefaultPlugins } from './workflow-builder/plugins/defaults';
import { pluginRegistry, type PluginRegistry } from './workflow-builder/plugins/registry';
import { jsonSerializer } from './workflow-builder/plugins/serializers';
import type {
	PluginContext,
	MutablePluginContext,
	ValidationIssue,
	SerializerContext,
} from './workflow-builder/plugins/types';
import { generateDeterministicNodeId } from './workflow-builder/string-utils';
import { addNodeWithSubnodes as addNodeWithSubnodesUtil } from './workflow-builder/subnode-utils';
import { parseWorkflowJSON } from './workflow-builder/workflow-import';

// Ensure default plugins are registered on module load
registerDefaultPlugins(pluginRegistry);

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
	private _registry?: PluginRegistry;
	private _staleIdToKeyMap?: Map<string, string>;

	constructor(
		id: string,
		name: string,
		settings: WorkflowSettings = {},
		nodes?: Map<string, GraphNode>,
		currentNode?: string | null,
		pinData?: Record<string, IDataObject[]>,
		meta?: { templateId?: string; instanceId?: string; [key: string]: unknown },
		registry?: PluginRegistry,
	) {
		this.id = id;
		this.name = name;
		this._settings = { ...settings };
		this._nodes = nodes ? new Map<string, GraphNode>(nodes) : new Map<string, GraphNode>();
		this._currentNode = currentNode ?? null;
		this._currentOutput = 0;
		this._pinData = pinData;
		this._meta = meta;
		this._registry = registry;
	}

	/**
	 * Create a MutablePluginContext for composite handlers.
	 * This provides helper methods that allow plugins to add nodes to the graph.
	 * @param nodes The mutable nodes map
	 * @param nameMapping Optional map to track node ID → actual map key for renamed nodes
	 */
	private createMutablePluginContext(
		nodes: Map<string, GraphNode>,
		nameMapping?: Map<string, string>,
	): MutablePluginContext {
		const effectiveNameMapping = nameMapping ?? new Map<string, string>();

		return {
			nodes,
			workflowId: this.id,
			workflowName: this.name,
			settings: this._settings,
			pinData: this._pinData,
			nameMapping: effectiveNameMapping,
			addNodeWithSubnodes: (node: NodeInstance<string, string, unknown>) => {
				const actualKey = this.addNodeWithSubnodes(nodes, node);
				// Auto-track renames when node is stored under a different key
				if (actualKey && actualKey !== node.name) {
					effectiveNameMapping.set(node.id, actualKey);
				}
				return actualKey;
			},
			addBranchToGraph: (branch: unknown) => {
				return this.addBranchToGraph(
					nodes,
					branch as NodeInstance<string, string, unknown>,
					effectiveNameMapping,
				);
			},
			trackRename: (nodeId: string, actualKey: string) => {
				effectiveNameMapping.set(nodeId, actualKey);
			},
		};
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
		const registry = this._registry ?? pluginRegistry;

		for (const chainNode of chain.allNodes) {
			// Try plugin dispatch for composites
			const handler = registry.findCompositeHandler(chainNode);
			if (handler?.collectPinData) {
				handler.collectPinData(chainNode, (node) => {
					pinData = this.collectPinDataFromNode(node, pinData);
				});
			} else if (chainNode?.config?.pinData) {
				// Regular node with pinData
				pinData = this.collectPinDataFromNode(chainNode, pinData);
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

	add(node: unknown): WorkflowBuilder {
		// Handle plain array (fan-out)
		// This adds all targets without creating a primary connection
		if (Array.isArray(node)) {
			for (const target of node) {
				if (isInputTarget(target)) {
					// InputTarget - add the target node
					const inputTargetNode = target.node;
					if (!this._nodes.has(inputTargetNode.name)) {
						this.addNodeWithSubnodes(this._nodes, inputTargetNode);
					}
				} else if (isNodeChain(target)) {
					// Chain - add all nodes from the chain
					for (const chainNode of target.allNodes) {
						if (!this._nodes.has(chainNode.name)) {
							this.addNodeWithSubnodes(this._nodes, chainNode);
						}
					}
					this.addConnectionTargetNodes(this._nodes, target);
				} else {
					// Regular node
					const targetNode = target as NodeInstance<string, string, unknown>;
					if (!this._nodes.has(targetNode.name)) {
						this.addNodeWithSubnodes(this._nodes, targetNode);
					}
				}
			}
			return this;
		}

		// Check for plugin composite handlers FIRST
		// This allows registered handlers to intercept composites before built-in handling
		// Always use global pluginRegistry as fallback (like we do for validators)
		const addRegistry = this._registry ?? pluginRegistry;
		const addHandler = addRegistry.findCompositeHandler(node);
		if (addHandler) {
			const ctx = this.createMutablePluginContext(this._nodes);
			const headName = addHandler.addNodes(node, ctx);
			this._currentNode = headName;
			this._currentOutput = 0;
			return this;
		}

		// Check if this is a NodeChain
		if (isNodeChain(node)) {
			// Track node ID -> actual map key for renamed nodes
			const nameMapping = new Map<string, string>();

			// Add all nodes from the chain, handling composites that may have been chained
			for (const chainNode of node.allNodes) {
				// Try plugin dispatch for composites - nameMapping is propagated through context
				const pluginResult = this.tryPluginDispatch(this._nodes, chainNode, nameMapping);
				if (pluginResult === undefined) {
					// Not a composite - add as regular node
					const actualKey = this.addNodeWithSubnodes(this._nodes, chainNode);
					// Track the actual key if it was renamed
					if (actualKey && actualKey !== chainNode.name) {
						nameMapping.set(chainNode.id, actualKey);
					}
				}
			}
			// Also add nodes from connections that aren't in allNodes (e.g., onError handlers)
			this.addConnectionTargetNodes(this._nodes, node, nameMapping);
			// Collect pinData from all nodes in the chain
			this._pinData = this.collectPinDataFromChain(node);
			// Set currentNode to the tail (last node in the chain)
			// Use nameMapping to get the actual key if the tail was renamed
			this._currentNode = nameMapping.get(node.tail.id) ?? node.tail.name;
			this._currentOutput = 0;
			return this;
		}

		// At this point, plugin dispatch has handled IfElseBuilder/SwitchCaseBuilder, and we've
		// handled NodeChain. The remaining type is NodeInstance or TriggerInstance.
		// Cast to NodeInstance to satisfy TypeScript (type narrowing).
		const regularNode = node as NodeInstance<string, string, unknown>;

		// Regular node or trigger
		const actualKey = this.addNodeWithSubnodes(this._nodes, regularNode) ?? regularNode.name;

		// Also add connection target nodes (e.g., onError handlers)
		// This is important when re-adding a node that already exists but has new connections
		this.addSingleNodeConnectionTargets(this._nodes, regularNode);

		// Collect pinData from the node if present
		this._pinData = this.collectPinData(regularNode);
		this._currentNode = actualKey;
		this._currentOutput = 0;

		return this;
	}

	to(nodeOrComposite: unknown): WorkflowBuilder {
		// Handle InputTarget (e.g., mergeNode.input(0))
		if (isInputTarget(nodeOrComposite)) {
			const actualNode = nodeOrComposite.node;
			const actualKey = this.addNodeWithSubnodes(this._nodes, actualNode) ?? actualNode.name;

			// Connect from current node to the target with the specified input index
			if (this._currentNode) {
				const currentGraphNode = this._nodes.get(this._currentNode);
				if (currentGraphNode) {
					const mainConns =
						currentGraphNode.connections.get('main') ?? new Map<number, ConnectionTarget[]>();
					const outputConns: ConnectionTarget[] = mainConns.get(this._currentOutput) ?? [];
					const alreadyConnected = outputConns.some(
						(c) => c.node === actualKey && c.index === nodeOrComposite.inputIndex,
					);
					if (!alreadyConnected) {
						outputConns.push({
							node: actualKey,
							type: 'main',
							index: nodeOrComposite.inputIndex,
						});
					}
					mainConns.set(this._currentOutput, outputConns);
					currentGraphNode.connections.set('main', mainConns);
				}
			}

			this._currentNode = actualKey;
			this._currentOutput = 0;
			return this;
		}

		// Handle array of nodes (fan-out pattern)
		if (Array.isArray(nodeOrComposite)) {
			return this.handleFanOut(nodeOrComposite);
		}

		// Handle NodeChain (e.g., node().to().to())
		// This must come before composite checks since chains have composite-like properties
		if (isNodeChain(nodeOrComposite)) {
			return this.handleNodeChain(nodeOrComposite);
		}

		// Check for plugin composite handlers
		// This allows registered handlers to intercept composites before built-in handling
		// Always use global pluginRegistry as fallback (like we do for validators)
		const thenRegistry = this._registry ?? pluginRegistry;
		const thenHandler = thenRegistry.findCompositeHandler(nodeOrComposite);
		if (thenHandler) {
			const ctx = this.createMutablePluginContext(this._nodes);
			const headName = thenHandler.addNodes(nodeOrComposite, ctx);

			// Connect current node to head of composite
			if (this._currentNode) {
				const currentGraphNode = this._nodes.get(this._currentNode);
				if (currentGraphNode) {
					const mainConns =
						currentGraphNode.connections.get('main') ?? new Map<number, ConnectionTarget[]>();
					const outputConns: ConnectionTarget[] = mainConns.get(this._currentOutput) ?? [];
					outputConns.push({ node: headName, type: 'main', index: 0 });
					mainConns.set(this._currentOutput, outputConns);
					currentGraphNode.connections.set('main', mainConns);
				}
			}

			this._currentNode = headName;
			this._currentOutput = 0;
			return this;
		}

		// At this point, plugin dispatch handled all composite types (IfElse, SwitchCase, Merge, SplitInBatches).
		// Remaining type is a regular NodeInstance.
		const node = nodeOrComposite as NodeInstance<string, string, unknown>;

		// addNodeWithSubnodes is idempotent: returns existing key for same instance,
		// generates unique name for name collisions, or adds new node.
		const actualKey = this.addNodeWithSubnodes(this._nodes, node) ?? node.name;

		// Add connection target nodes (e.g., onError handlers)
		this.addSingleNodeConnectionTargets(this._nodes, node);

		// Connect from current node if exists
		if (this._currentNode) {
			const currentGraphNode = this._nodes.get(this._currentNode);
			if (currentGraphNode) {
				const mainConns =
					currentGraphNode.connections.get('main') ?? new Map<number, ConnectionTarget[]>();
				const outputConnections: ConnectionTarget[] = mainConns.get(this._currentOutput) ?? [];
				// Check for duplicate connections
				const alreadyConnected = outputConnections.some((c) => c.node === actualKey);
				if (!alreadyConnected) {
					mainConns.set(this._currentOutput, [
						...outputConnections,
						{ node: actualKey, type: 'main', index: 0 },
					]);
					currentGraphNode.connections.set('main', mainConns);
				}
			}
		}

		// Collect pinData from the node if present
		this._pinData = this.collectPinData(node);
		this._currentNode = actualKey;
		this._currentOutput = 0;

		return this;
	}

	output(): never {
		throw new Error(
			'Cannot call .output() on the workflow builder. ' +
				'Use .output() on a node variable instead: myNode.output(0).to(targetNode)',
		);
	}

	input(): never {
		throw new Error(
			'Cannot call .input() on the workflow builder. ' +
				'Use .input() on a node variable instead: myNode.input(1)',
		);
	}

	settings(settings: WorkflowSettings): WorkflowBuilder {
		this._settings = { ...this._settings, ...settings };
		return this;
	}

	connect(
		source: NodeInstance<string, string, unknown>,
		sourceOutput: number,
		target: NodeInstance<string, string, unknown>,
		targetInput: number,
	): WorkflowBuilder {
		// Ensure both nodes exist in the graph
		if (!this._nodes.has(source.name)) {
			this.addNodeWithSubnodes(this._nodes, source);
		}
		if (!this._nodes.has(target.name)) {
			this.addNodeWithSubnodes(this._nodes, target);
		}

		// Add the explicit connection from source to target
		const sourceNode = this._nodes.get(source.name);
		if (sourceNode) {
			const mainConns = sourceNode.connections.get('main') ?? new Map<number, ConnectionTarget[]>();
			const outputConns = mainConns.get(sourceOutput) ?? [];

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

		return this;
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
		// Merge connections declared on node instances via .to() into the graph
		this.mergeInstanceConnections();

		// Create serializer context and delegate to jsonSerializer
		const ctx: SerializerContext = {
			nodes: this._nodes,
			workflowId: this.id,
			workflowName: this.name,
			settings: this._settings,
			pinData: this._pinData,
			meta: this._meta,
			resolveTargetNodeName: (target: unknown) => this.resolveTargetNodeName(target),
		};

		return jsonSerializer.serialize(ctx);
	}

	/**
	 * Merge connections declared on node instances via .to() into the graph connections.
	 * This prepares the graph for serialization by ensuring all connections are stored
	 * in graphNode.connections.
	 */
	private mergeInstanceConnections(): void {
		for (const graphNode of this._nodes.values()) {
			// Only process if the node instance has getConnections() (nodes from builder, not fromJSON)
			if (typeof graphNode.instance.getConnections === 'function') {
				const nodeConns = graphNode.instance.getConnections();
				for (const { target, outputIndex, targetInputIndex } of nodeConns) {
					// Resolve target node name - handles both NodeInstance and composites.
					// Pass _staleIdToKeyMap so stale target references (from pre-clone
					// instances after regenerateNodeIds) resolve to the correct map key.
					const targetName = this.resolveTargetNodeName(target, this._staleIdToKeyMap);
					if (!targetName) continue;

					const mainConns =
						graphNode.connections.get('main') ?? new Map<number, ConnectionTarget[]>();
					const outputConns: ConnectionTarget[] = mainConns.get(outputIndex) ?? [];
					// Avoid duplicates - check both target node AND input index
					const targetIndex = targetInputIndex ?? 0;
					const alreadyExists = outputConns.some(
						(c) => c.node === targetName && c.index === targetIndex,
					);
					if (!alreadyExists) {
						outputConns.push({ node: targetName, type: 'main', index: targetIndex });
						mainConns.set(outputIndex, outputConns);
						graphNode.connections.set('main', mainConns);
					}
				}
			}
		}
	}

	/**
	 * Regenerate all node IDs using deterministic hashing based on workflow ID, node type, and node name.
	 * This ensures that the same workflow structure always produces the same node IDs,
	 * which is critical for the AI workflow builder where code may be re-parsed multiple times.
	 *
	 * Node IDs are generated using SHA-256 hash of `${workflowId}:${nodeType}:${nodeName}`,
	 * formatted as a valid UUID v4 structure.
	 */
	regenerateNodeIds(): void {
		const newNodes = new Map<string, GraphNode>();
		// Build mapping from old instance IDs to map keys BEFORE cloning.
		// Cloned instances' _connections still reference original target instances
		// with old IDs. This mapping allows mergeInstanceConnections() to resolve
		// those stale references to the correct map key (important for auto-renamed nodes).
		const staleIdToKeyMap = new Map<string, string>();

		for (const [mapKey, graphNode] of this._nodes) {
			const instance = graphNode.instance;
			staleIdToKeyMap.set(instance.id, mapKey);
			const newId = generateDeterministicNodeId(this.id, instance.type, mapKey);

			// Clone the instance with the new deterministic ID
			const newInstance = cloneNodeWithId(instance, newId);

			newNodes.set(mapKey, {
				instance: newInstance,
				connections: graphNode.connections,
			});
		}

		this._staleIdToKeyMap = staleIdToKeyMap;
		// Replace the nodes map
		this._nodes = newNodes;
	}

	validate(options: ValidationOptions = {}): ValidationResult {
		const errors: ValidationError[] = [];
		const warnings: ValidationWarning[] = [];

		// Run plugin-based validators (use provided registry or global)
		const registry = this._registry ?? pluginRegistry;
		const pluginCtx: PluginContext = {
			nodes: this._nodes,
			workflowId: this.id,
			workflowName: this.name,
			settings: this._settings,
			pinData: this._pinData,
			validationOptions: {
				allowDisconnectedNodes: options.allowDisconnectedNodes,
				allowNoTrigger: options.allowNoTrigger,
				nodeTypesProvider: options.nodeTypesProvider,
			},
		};

		// Run validators for each node
		for (const [_mapKey, graphNode] of this._nodes) {
			const nodeType = graphNode.instance.type;
			const validators = registry.getValidatorsForNodeType(nodeType);

			for (const validator of validators) {
				const issues = validator.validateNode(graphNode.instance, graphNode, pluginCtx);
				this.collectValidationIssues(issues, errors, warnings, ValidationError, ValidationWarning);
			}
		}

		// Run workflow-level validators
		for (const validator of registry.getValidators()) {
			if (validator.validateWorkflow) {
				const issues = validator.validateWorkflow(pluginCtx);
				this.collectValidationIssues(issues, errors, warnings, ValidationError, ValidationWarning);
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		};
	}

	/**
	 * Collect validation issues from plugins and add them to errors/warnings arrays
	 */
	private collectValidationIssues(
		issues: ValidationIssue[],
		errors: ValidationError[],
		warnings: ValidationWarning[],
		ValidationErrorClass: typeof ValidationError,
		ValidationWarningClass: typeof ValidationWarning,
	): void {
		for (const issue of issues) {
			// Cast code to ValidationErrorCode - plugins can use custom codes
			// that extend the built-in set
			const code = issue.code as ValidationErrorCode;
			if (issue.severity === 'error') {
				errors.push(
					new ValidationErrorClass(
						code,
						issue.message,
						issue.nodeName,
						undefined,
						issue.violationLevel,
					),
				);
			} else {
				warnings.push(
					new ValidationWarningClass(
						code,
						issue.message,
						issue.nodeName,
						issue.parameterPath,
						issue.originalName,
						issue.violationLevel,
					),
				);
			}
		}
	}

	toString(): string {
		return JSON.stringify(this.toJSON(), null, 2);
	}

	toFormat<T>(format: string): T {
		const registry = this._registry;
		if (!registry) {
			throw new Error(
				`No serializer registered for format '${format}'. Provide a registry with serializers when creating the workflow.`,
			);
		}
		const serializer = registry.getSerializer(format);
		if (!serializer) {
			throw new Error(`No serializer registered for format '${format}'`);
		}

		const ctx: SerializerContext = {
			nodes: this._nodes,
			workflowId: this.id,
			workflowName: this.name,
			settings: this._settings,
			pinData: this._pinData,
			meta: this._meta,
			resolveTargetNodeName: (target: unknown) => this.resolveTargetNodeName(target),
		};

		return serializer.serialize(ctx) as T;
	}

	generatePinData(options?: GeneratePinDataOptions): WorkflowBuilder {
		const { beforeWorkflow } = options ?? {};

		// Build set of existing node names from beforeWorkflow for quick lookup
		const existingNodeNames = beforeWorkflow
			? new Set(beforeWorkflow.nodes.map((n) => n.name))
			: undefined;

		for (const graphNode of this._nodes.values()) {
			const node = graphNode.instance;
			const nodeName = node.name;

			// Skip if node exists in beforeWorkflow (only process NEW nodes)
			if (existingNodeNames?.has(nodeName)) {
				continue;
			}

			// Skip if node already has pin data in current workflow
			if (this._pinData?.[nodeName]) {
				continue;
			}

			// Only generate for nodes that meet pin data criteria
			if (!shouldGeneratePinData(node)) {
				continue;
			}

			// Generate pin data from output declaration
			const output = node.config?.output;
			if (output && output.length > 0) {
				this._pinData = this._pinData ?? {};
				this._pinData[nodeName] = output;
			}
		}

		return this;
	}

	/**
	 * Resolve the target node name from a connection target.
	 * Delegates to the resolveTargetNodeName utility function.
	 */
	private resolveTargetNodeName(
		target: unknown,
		nameMapping?: Map<string, string>,
	): string | undefined {
		const registry = this._registry ?? pluginRegistry;
		return resolveTargetNodeNameUtil(target, this._nodes, registry, nameMapping);
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
		const registry = this._registry ?? pluginRegistry;
		const connections = chain.getConnections();
		for (const { target } of connections) {
			// Skip if target is a composite type (already handled by plugin dispatch elsewhere)
			if (registry.isCompositeType(target)) continue;

			// Handle NodeChains - use addBranchToGraph to add all nodes with their connections
			if (isNodeChain(target)) {
				this.addBranchToGraph(nodes, target, nameMapping);
				continue;
			}

			// Handle InputTarget - add the referenced node
			if (isInputTarget(target)) {
				const inputTargetNode = target.node;
				if (!nodes.has(inputTargetNode.name)) {
					const actualKey = this.addNodeWithSubnodes(nodes, inputTargetNode);
					if (actualKey && nameMapping && actualKey !== inputTargetNode.name) {
						nameMapping.set(inputTargetNode.id, actualKey);
					}
				}
				continue;
			}

			// Add the target node if not already in the map
			const targetNode = target;
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

		const registry = this._registry ?? pluginRegistry;
		const connections = nodeInstance.getConnections();
		for (const { target } of connections) {
			// Skip if target is a composite type (already handled by plugin dispatch elsewhere)
			if (registry.isCompositeType(target)) continue;

			// Handle NodeChains - use addBranchToGraph to add all nodes with their connections
			if (isNodeChain(target)) {
				this.addBranchToGraph(nodes, target);
				continue;
			}

			// Handle InputTarget - add the referenced node
			if (isInputTarget(target)) {
				const inputTargetNode = target.node;
				if (!nodes.has(inputTargetNode.name)) {
					this.addNodeWithSubnodes(nodes, inputTargetNode);
				}
				continue;
			}

			// Add the target node if not already in the map
			const targetNode = target;
			if (!nodes.has(targetNode.name)) {
				this.addNodeWithSubnodes(nodes, targetNode);
			}
		}
	}

	/**
	 * Try to dispatch a composite to a plugin handler.
	 * Returns the head node name if a handler processed it, undefined otherwise.
	 *
	 * This is used to replace inline composite handling methods with plugin-based dispatch.
	 * The method checks for duplicate processing using the main node name and delegates
	 * to the appropriate plugin handler if one is registered.
	 *
	 * @param nodes The mutable nodes map
	 * @param target The target to dispatch (composite, builder, or node)
	 * @param nameMapping Optional map to track node ID → actual map key for renamed nodes
	 */
	private tryPluginDispatch(
		nodes: Map<string, GraphNode>,
		target: unknown,
		nameMapping?: Map<string, string>,
	): string | undefined {
		// NOTE: We intentionally don't skip if the main node already exists.
		// Handlers like ifElseHandler are designed to MERGE connections when the node exists.
		// This is important for patterns like:
		//   .add(is_Approved.to(merge1.input(1)))  // Adds IF node first
		//   .add(merge_node.to(set_Default_True_2.to(is_Approved.onTrue(x_Post.to(x_Result)))))
		// The second line needs to add the onTrue() branch even though the IF node already exists.

		// Try plugin dispatch
		const registry = this._registry ?? pluginRegistry;
		const handler = registry.findCompositeHandler(target);
		if (handler) {
			const ctx = this.createMutablePluginContext(nodes, nameMapping);
			return handler.addNodes(target, ctx);
		}

		return undefined;
	}

	/**
	 * Add a node and its subnodes to the nodes map, creating AI connections.
	 * Delegates to the addNodeWithSubnodes utility function.
	 */
	private addNodeWithSubnodes(
		nodes: Map<string, GraphNode>,
		nodeInstance: NodeInstance<string, string, unknown>,
	): string | undefined {
		return addNodeWithSubnodesUtil(nodes, nodeInstance);
	}

	/**
	 * Handle fan-out pattern - connects current node to multiple target nodes
	 * Supports NodeChain targets (e.g., workflow.to([x1, fb, linkedin.to(sheets)]))
	 *
	 * Each array element maps to a different output index (branching).
	 * Use null to skip an output index.
	 */
	private handleFanOut(nodes: unknown[]): WorkflowBuilder {
		if (nodes.length === 0) {
			return this;
		}

		const currentGraphNode = this._currentNode ? this._nodes.get(this._currentNode) : undefined;

		// Add all target nodes and connect them to the current node
		nodes.forEach((node, index) => {
			// Skip null values (empty branches) but preserve the index for correct output mapping
			if (node === null) {
				return;
			}

			// Use addBranchToGraph to handle NodeChains properly
			// This returns the head node name for connection
			const headNodeName = this.addBranchToGraph(
				this._nodes,
				node as NodeInstance<string, string, unknown>,
			);

			// Connect from current node to the head of this target
			// Array syntax always uses incrementing output indices (branching behavior)
			if (this._currentNode && currentGraphNode) {
				const mainConns =
					currentGraphNode.connections.get('main') ?? new Map<number, ConnectionTarget[]>();
				const outputConnections: ConnectionTarget[] = mainConns.get(index) ?? [];
				mainConns.set(index, [
					...outputConnections,
					{ node: headNodeName, type: 'main', index: 0 },
				]);
				currentGraphNode.connections.set('main', mainConns);
			}
		});

		// Set the last non-null node in the array as the current node (for continued chaining)
		// For NodeChains, use the tail node name (if tail is not null)
		const nonNullNodes = nodes.filter((n): n is NonNullable<unknown> => n !== null);
		const lastNode = nonNullNodes[nonNullNodes.length - 1];
		this._currentNode = lastNode
			? isNodeChain(lastNode)
				? (lastNode.tail?.name ?? this._currentNode)
				: (lastNode as NodeInstance<string, string, unknown>).name
			: this._currentNode;
		this._currentOutput = 0;

		return this;
	}

	/**
	 * Handle a NodeChain passed to workflow.to()
	 * This is used when chained node calls are passed directly, e.g., workflow.to(node().to().to())
	 */
	private handleNodeChain(chain: NodeChain): WorkflowBuilder {
		// Add the head node and connect from current workflow position
		const headNodeName = this.addBranchToGraph(this._nodes, chain);

		// Connect from current workflow node to the head of the chain
		if (this._currentNode) {
			const currentGraphNode = this._nodes.get(this._currentNode);
			if (currentGraphNode) {
				const mainConns =
					currentGraphNode.connections.get('main') ?? new Map<number, ConnectionTarget[]>();
				const outputConnections: ConnectionTarget[] = mainConns.get(this._currentOutput) ?? [];

				// Standard behavior: connect to chain head
				outputConnections.push({ node: headNodeName, type: 'main', index: 0 });

				mainConns.set(this._currentOutput, outputConnections);
				currentGraphNode.connections.set('main', mainConns);
			}
		}

		// Collect pinData from the chain
		this._pinData = this.collectPinDataFromChain(chain);

		// Set current node to the tail of the chain
		this._currentNode = chain.tail?.name ?? headNodeName;
		this._currentOutput = 0;

		return this;
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
		const registry = this._registry ?? pluginRegistry;

		// Try plugin dispatch first - handles all composite types
		const pluginResult = this.tryPluginDispatch(nodes, branch, effectiveNameMapping);
		if (pluginResult !== undefined) {
			return pluginResult;
		}

		// Check if the branch is a NodeChain
		if (isNodeChain(branch)) {
			// Add all nodes from the chain, handling composites that may have been chained
			for (const chainNode of branch.allNodes) {
				// Skip null values (can occur when .to([null, node]) is used)
				if (chainNode === null) {
					continue;
				}

				// Skip invalid objects that aren't valid nodes or composites
				// An object is valid if it has a 'name' property (NodeInstance) or is a registered composite type
				if (
					typeof chainNode !== 'object' ||
					(!('name' in chainNode) && !registry.isCompositeType(chainNode))
				) {
					continue;
				}

				// Try plugin dispatch for composites
				const chainPluginResult = this.tryPluginDispatch(nodes, chainNode, effectiveNameMapping);
				if (chainPluginResult === undefined) {
					// Not a composite - add as regular node
					const actualKey = this.addNodeWithSubnodes(nodes, chainNode);
					// Track the actual key if it was renamed
					if (actualKey && actualKey !== chainNode.name) {
						effectiveNameMapping.set(chainNode.id, actualKey);
					}
				}
			}

			// Process connections declared on the chain (from .to() calls)
			const connections = branch.getConnections();
			for (const { target, outputIndex, targetInputIndex } of connections) {
				// Find the source node in the chain that declared this connection
				// by looking for the node whose .to() was called
				for (const chainNode of branch.allNodes) {
					// Skip null values (from array syntax like [null, node])
					if (chainNode === null) {
						continue;
					}

					// Get the actual node instance that might have connections
					// Nodes without getConnections (like SplitInBatchesBuilder) are skipped
					if (typeof chainNode.getConnections !== 'function') {
						continue;
					}
					const nodeToCheck = chainNode;
					const nodeName = chainNode.name;

					if (nodeToCheck && nodeName && typeof nodeToCheck.getConnections === 'function') {
						const nodeConns = nodeToCheck.getConnections();
						if (
							nodeConns.some(
								(c) =>
									c.target === target &&
									c.outputIndex === outputIndex &&
									c.targetInputIndex === targetInputIndex,
							)
						) {
							// This chain node declared this connection
							// First, ensure target nodes are added to the graph (e.g., error handler chains)
							if (isNodeChain(target)) {
								const chainTarget = target;
								// Add each node in the chain that isn't already in the map
								// We can't just check the head because the chain may reuse an existing
								// node as head (e.g., set_content) while having new nodes after it
								for (const targetChainNode of chainTarget.allNodes) {
									if (targetChainNode === null) continue;

									// Try plugin dispatch for composites
									const targetPluginResult = this.tryPluginDispatch(
										nodes,
										targetChainNode,
										effectiveNameMapping,
									);
									if (targetPluginResult === undefined && !nodes.has(targetChainNode.name)) {
										// Not a composite and not already present - add as regular node
										this.addNodeWithSubnodes(nodes, targetChainNode);
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
							const sourceGraphNode = nodes.get(actualSourceKey);
							if (sourceGraphNode) {
								const targetName = this.resolveTargetNodeName(target, effectiveNameMapping);
								if (targetName) {
									const mainConns =
										sourceGraphNode.connections.get('main') ??
										new Map<number, ConnectionTarget[]>();
									const outputConns: ConnectionTarget[] = mainConns.get(outputIndex) ?? [];
									if (
										!outputConns.some(
											(c) => c.node === targetName && c.index === (targetInputIndex ?? 0),
										)
									) {
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
			// Single node - add it and return its name
			// Note: Composites are handled by tryPluginDispatch at the entry point
			const actualKey = this.addNodeWithSubnodes(nodes, branch);
			// If the node was renamed, track it and return the actual key
			if (actualKey && actualKey !== branch.name) {
				effectiveNameMapping.set(branch.id, actualKey);
			}
			return actualKey ?? branch.name;
		}
	}
}

/**
 * Helper to check if options is a WorkflowBuilderOptions object
 */
function isWorkflowBuilderOptions(
	options: WorkflowSettings | WorkflowBuilderOptions | undefined,
): options is WorkflowBuilderOptions {
	if (!options) return false;
	// WorkflowBuilderOptions has 'settings' or 'registry' as keys
	// WorkflowSettings has keys like 'timezone', 'executionOrder', etc.
	return 'settings' in options || 'registry' in options;
}

/**
 * Create a new workflow builder
 */
function createWorkflow(
	id: string,
	name: string,
	options?: WorkflowSettings | WorkflowBuilderOptions,
): WorkflowBuilder {
	if (isWorkflowBuilderOptions(options)) {
		return new WorkflowBuilderImpl(
			id,
			name,
			options.settings,
			undefined,
			undefined,
			undefined,
			undefined,
			options.registry,
		);
	}
	return new WorkflowBuilderImpl(id, name, options);
}

/**
 * Import workflow from n8n JSON format
 */
function fromJSON(json: WorkflowJSON): WorkflowBuilder {
	const parsed = parseWorkflowJSON(json);
	return new WorkflowBuilderImpl(
		parsed.id,
		parsed.name,
		parsed.settings,
		parsed.nodes,
		parsed.lastNode,
		parsed.pinData,
		parsed.meta,
	);
}

/**
 * Workflow builder factory function with static methods
 */
export const workflow: WorkflowBuilderStatic = Object.assign(createWorkflow, {
	fromJSON,
});
