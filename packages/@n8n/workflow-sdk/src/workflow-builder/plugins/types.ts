/**
 * Plugin Architecture Types
 *
 * Defines interfaces for the plugin system that allows extending
 * WorkflowBuilder with custom validators, composite handlers, and serializers.
 */

import type { GraphNode, NodeInstance, IDataObject } from '../../types/base';

// =============================================================================
// Utility Functions for Validators
// =============================================================================

/**
 * Find the map key for a given graphNode by searching the nodes map.
 * Nodes can be auto-renamed (e.g., "Merge" -> "Merge 1") so we need
 * to find the actual key, not rely on node.name.
 */
export function findMapKey(graphNode: GraphNode, ctx: PluginContext): string {
	for (const [mapKey, node] of ctx.nodes) {
		if (node === graphNode) {
			return mapKey;
		}
	}
	return graphNode.instance.name; // Fallback to instance name
}

/**
 * Check if a node was auto-renamed (pattern: "Name" -> "Name 1", "Name 2", etc.)
 */
export function isAutoRenamed(mapKey: string, originalName: string): boolean {
	if (mapKey === originalName) return false;
	if (!mapKey.startsWith(originalName + ' ')) return false;
	const suffix = mapKey.slice(originalName.length + 1);
	return /^\d+$/.test(suffix);
}

/**
 * Format a node reference for warning messages, including node type and original name if renamed
 */
export function formatNodeRef(
	displayName: string,
	originalName?: string,
	nodeType?: string,
): string {
	const typeSuffix = nodeType ? ` [${nodeType}]` : '';
	if (originalName && originalName !== displayName) {
		return `'${displayName}' (originally '${originalName}')${typeSuffix}`;
	}
	return `'${displayName}'${typeSuffix}`;
}

// =============================================================================
// Validation Issue
// =============================================================================

/**
 * A validation issue (error or warning) reported by a validator plugin.
 */
export interface ValidationIssue {
	/** Unique code identifying the issue type */
	readonly code: string;
	/** Human-readable message describing the issue */
	readonly message: string;
	/** Severity level: 'error' for fatal issues, 'warning' for non-fatal */
	readonly severity: 'error' | 'warning';
	/** Violation level for evaluation scoring (defaults to 'minor' if not set) */
	readonly violationLevel?: 'critical' | 'major' | 'minor';
	/** Name of the node where the issue was found (optional) */
	readonly nodeName?: string;
	/** Path to the parameter that caused the issue (optional) */
	readonly parameterPath?: string;
	/** Original name if node was auto-renamed (optional) */
	readonly originalName?: string;
}

// =============================================================================
// Plugin Context
// =============================================================================

/**
 * Provider interface for looking up node type metadata.
 */
export interface NodeTypesProvider {
	getByNameAndVersion(
		type: string,
		version?: number,
	):
		| {
				description?: {
					maxNodes?: number;
					displayName?: string;
					properties?: readonly unknown[];
				};
		  }
		| undefined;
}

/**
 * Validation options that can be passed to validators via PluginContext.
 */
export interface ValidationOptions {
	/** If true, skip validation for disconnected nodes */
	readonly allowDisconnectedNodes?: boolean;
	/** If true, skip validation for missing trigger nodes */
	readonly allowNoTrigger?: boolean;
	/** Optional provider for looking up node type metadata (e.g., maxNodes) */
	readonly nodeTypesProvider?: NodeTypesProvider;
}

/**
 * Read-only context passed to plugins for accessing workflow state.
 */
export interface PluginContext {
	/** Map of node names to their graph representations */
	readonly nodes: ReadonlyMap<string, GraphNode>;
	/** Workflow ID */
	readonly workflowId: string;
	/** Workflow name */
	readonly workflowName: string;
	/** Workflow settings */
	readonly settings: Record<string, unknown>;
	/** Optional pin data for nodes */
	readonly pinData?: Record<string, IDataObject[]>;
	/** Optional validation options (available during validation) */
	readonly validationOptions?: ValidationOptions;
}

/**
 * Mutable context passed to plugins that need to modify workflow state.
 * Used by composite handlers when adding nodes to the graph.
 */
export interface MutablePluginContext extends Omit<PluginContext, 'nodes'> {
	/** Mutable map of node names to their graph representations */
	nodes: Map<string, GraphNode>;

	/**
	 * Add a node and its subnodes to the graph.
	 * @param node The node instance to add
	 * @returns The node ID if assigned, or undefined
	 */
	addNodeWithSubnodes(node: NodeInstance<string, string, unknown>): string | undefined;

	/**
	 * Add a branch (chain of nodes) to the graph.
	 * @param branch The branch to add (NodeInstance, NodeChain, or array)
	 * @returns The name of the head node of the branch
	 */
	addBranchToGraph(branch: unknown): string;

	/**
	 * Map from node ID to actual map key for renamed nodes.
	 * When a workflow has duplicate node names (e.g., two nodes named "Process"),
	 * the builder auto-renames them ("Process" → "Process 1").
	 * This mapping tracks these renames: nodeId → actualMapKey.
	 * Plugin handlers should use this when resolving node references.
	 */
	nameMapping?: Map<string, string>;

	/**
	 * Track a node rename in the nameMapping.
	 * Call this when addNodeWithSubnodes returns a different key than node.name.
	 * @param nodeId The node's unique ID
	 * @param actualKey The actual key the node was stored under in the nodes map
	 */
	trackRename?(nodeId: string, actualKey: string): void;
}

// =============================================================================
// Validator Plugin
// =============================================================================

/**
 * A plugin that validates nodes and/or workflows.
 *
 * Validators can target specific node types or all nodes. They're executed
 * during workflow validation and can return errors (fatal) or warnings.
 *
 * @example
 * ```typescript
 * const agentValidator: ValidatorPlugin = {
 *   id: 'core:agent',
 *   name: 'Agent Validator',
 *   nodeTypes: ['@n8n/n8n-nodes-langchain.agent'],
 *   validateNode: (node, graphNode, ctx) => {
 *     const issues: ValidationIssue[] = [];
 *     if (node.config?.parameters?.promptType === 'define') {
 *       // Check for static prompt
 *       issues.push({
 *         code: 'AGENT_STATIC_PROMPT',
 *         message: 'Agent using static prompt',
 *         severity: 'warning',
 *         nodeName: node.name,
 *       });
 *     }
 *     return issues;
 *   },
 * };
 * ```
 */
export interface ValidatorPlugin {
	/** Unique identifier for this validator (e.g., 'core:agent') */
	readonly id: string;
	/** Human-readable name for this validator */
	readonly name: string;
	/**
	 * Node types this validator applies to.
	 * Empty array or undefined means applies to all nodes.
	 */
	readonly nodeTypes?: string[];
	/**
	 * Priority for execution order (higher runs first).
	 * Default is 0.
	 */
	readonly priority?: number;

	/**
	 * Validate a single node.
	 * @param node The node instance being validated
	 * @param graphNode The graph representation of the node
	 * @param ctx Plugin context with workflow state
	 * @returns Array of validation issues found
	 */
	validateNode(
		node: NodeInstance<string, string, unknown>,
		graphNode: GraphNode,
		ctx: PluginContext,
	): ValidationIssue[];

	/**
	 * Validate the entire workflow (optional).
	 * Called once per validation, after all nodes have been validated.
	 * @param ctx Plugin context with workflow state
	 * @returns Array of validation issues found
	 */
	validateWorkflow?(ctx: PluginContext): ValidationIssue[];
}

// =============================================================================
// Composite Handler Plugin
// =============================================================================

/**
 * A plugin that handles composite node structures (if/else, switch/case, etc.).
 *
 * Composite handlers are responsible for recognizing composite patterns and
 * adding the appropriate nodes and connections to the workflow graph.
 *
 * @example
 * ```typescript
 * const ifElseHandler: CompositeHandlerPlugin<IfElseComposite> = {
 *   id: 'core:if-else',
 *   name: 'If/Else Handler',
 *   canHandle: (input): input is IfElseComposite =>
 *     isIfElseComposite(input),
 *   addNodes: (composite, ctx) => {
 *     ctx.addNodeWithSubnodes(composite.ifNode);
 *     if (composite.trueBranch) {
 *       ctx.addBranchToGraph(composite.trueBranch);
 *     }
 *     return composite.ifNode.name;
 *   },
 * };
 * ```
 */
export interface CompositeHandlerPlugin<TInput = unknown> {
	/** Unique identifier for this handler (e.g., 'core:if-else') */
	readonly id: string;
	/** Human-readable name for this handler */
	readonly name: string;
	/**
	 * Priority for handler selection (higher checked first).
	 * Default is 0.
	 */
	readonly priority?: number;

	/**
	 * Check if this handler can process the input.
	 * @param input The input to check
	 * @returns true if this handler can process the input
	 */
	canHandle(input: unknown): input is TInput;

	/**
	 * Add nodes from the composite to the graph.
	 * @param input The composite input (guaranteed to pass canHandle)
	 * @param ctx Mutable context for adding nodes
	 * @returns The name of the head node (entry point)
	 */
	addNodes(input: TInput, ctx: MutablePluginContext): string;

	/**
	 * Handle .to() chaining from this composite (optional).
	 * Allows composites to define custom continuation behavior.
	 * @param input The composite input
	 * @param currentNode The current node name before chaining
	 * @param currentOutput The current output index
	 * @param ctx Mutable context for modifications
	 * @returns The new current node and output for continuation
	 */
	handleThen?(
		input: TInput,
		currentNode: string,
		currentOutput: number,
		ctx: MutablePluginContext,
	): { currentNode: string; currentOutput: number };

	/**
	 * Get the head node name from a composite (optional).
	 * Used to resolve connection targets without needing type-specific knowledge.
	 * @param input The composite input (guaranteed to pass canHandle)
	 * @returns Either a string (node name) or { name, id } for nameMapping support
	 */
	getHeadNodeName?(input: TInput): string | { name: string; id: string };

	/**
	 * Collect nodes from this composite for pin data gathering (optional).
	 * Called with a collector function that should be invoked for each node.
	 * @param input The composite input (guaranteed to pass canHandle)
	 * @param collector Function to call for each node that might have pin data
	 */
	collectPinData?(
		input: TInput,
		collector: (node: NodeInstance<string, string, unknown>) => void,
	): void;
}

// =============================================================================
// Serializer Plugin
// =============================================================================

/**
 * Extended context for serializers with helper methods for conversion.
 *
 * SerializerContext provides all the information needed to serialize
 * a workflow to any output format, including name resolution
 * and workflow metadata.
 */
export interface SerializerContext extends PluginContext {
	/**
	 * Resolve a connection target to its node name.
	 * Handles NodeInstance, NodeChain, composites (IfElse, SwitchCase, etc.),
	 * and InputTarget types.
	 * @param target The connection target to resolve
	 * @returns The resolved node name, or undefined if invalid
	 */
	resolveTargetNodeName(target: unknown): string | undefined;

	/** Workflow meta information (if set) */
	readonly meta?: Record<string, unknown>;
}

/**
 * A plugin that serializes workflow state to a specific format.
 *
 * Serializers transform the internal workflow representation into
 * output formats like JSON, YAML, or custom formats.
 *
 * @example
 * ```typescript
 * const jsonSerializer: SerializerPlugin<WorkflowJSON> = {
 *   id: 'core:json',
 *   name: 'JSON Serializer',
 *   format: 'json',
 *   serialize: (ctx) => ({
 *     id: ctx.workflowId,
 *     name: ctx.workflowName,
 *     nodes: [...ctx.nodes.values()].map(n => nodeToJSON(n)),
 *     connections: buildConnections(ctx),
 *     settings: ctx.settings,
 *   }),
 * };
 * ```
 */
export interface SerializerPlugin<TOutput = unknown> {
	/** Unique identifier for this serializer (e.g., 'core:json') */
	readonly id: string;
	/** Human-readable name for this serializer */
	readonly name: string;
	/** Format identifier used to select this serializer */
	readonly format: string;

	/**
	 * Serialize the workflow to the target format.
	 * @param ctx Serializer context with workflow state and helper methods
	 * @returns The serialized workflow in the target format
	 */
	serialize(ctx: SerializerContext): TOutput;
}
