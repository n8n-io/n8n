/**
 * TypeScript interfaces for script execution tools.
 *
 * These interfaces define the input/output types for builder tools when used
 * within script execution context. They are derived from the Zod schemas
 * in the corresponding tool files.
 */

import type { INodeParameters } from 'n8n-workflow';

// ============================================================================
// Node Reference Utility
// ============================================================================

/**
 * A reference to a node - can be either a nodeId string or an object with nodeId property.
 * This allows passing AddNodeResult objects directly to connectNodes without extracting .nodeId
 */
export type NodeReference = string | { nodeId?: string };

/**
 * Extract nodeId from a NodeReference
 * @param ref - Either a string nodeId or an object with nodeId property (like AddNodeResult)
 * @returns The nodeId string, or undefined if not found
 */
export function resolveNodeId(ref: NodeReference): string | undefined {
	if (typeof ref === 'string') return ref;
	if (ref && typeof ref === 'object' && 'nodeId' in ref) {
		return ref.nodeId;
	}
	return undefined;
}

// ============================================================================
// Add Node Tool
// ============================================================================

/**
 * Input for adding a node to the workflow (full form)
 */
export interface AddNodeInputFull {
	/** The type of node to add (e.g., n8n-nodes-base.httpRequest) */
	nodeType: string;
	/** The exact node version (optional - defaults to latest) */
	nodeVersion?: number;
	/** A descriptive name for the node that clearly indicates its purpose */
	name?: string;
	/** Explanation of reasoning about initial parameters (optional) */
	initialParametersReasoning?: string;
	/** Initial parameters to set on the node (optional - defaults to {}) */
	initialParameters?: INodeParameters;
}

/**
 * Short-form input for adding a node (reduces tokens)
 * t=nodeType, v=nodeVersion, n=name, r=reasoning, p=parameters
 */
export interface AddNodeInputShort {
	/** Short for nodeType */
	t: string;
	/** Short for nodeVersion (optional - defaults to latest) */
	v?: number;
	/** Short for name (optional) */
	n?: string;
	/** Short for initialParametersReasoning (optional) */
	r?: string;
	/** Short for initialParameters (optional - defaults to {}) */
	p?: INodeParameters;
}

/**
 * Input for adding a node - accepts both full and short forms
 */
export type AddNodeInput = AddNodeInputFull | AddNodeInputShort;

/**
 * Normalize AddNodeInput to full form
 */
export function normalizeAddNodeInput(input: AddNodeInput): AddNodeInputFull {
	if ('t' in input) {
		return {
			nodeType: input.t,
			nodeVersion: input.v,
			name: input.n,
			initialParametersReasoning: input.r,
			initialParameters: input.p,
		};
	}
	return input;
}

/**
 * Output from adding a node
 */
export interface AddNodeResult {
	success: boolean;
	/** The UUID of the created node */
	nodeId?: string;
	/** The name assigned to the node (may differ from input if name was taken) */
	nodeName?: string;
	/** The node type */
	nodeType?: string;
	/** Display name of the node type */
	displayName?: string;
	/** Position on the canvas [x, y] */
	position?: [number, number];
	/** Error message if failed */
	error?: string;
}

// ============================================================================
// Add Multiple Nodes Tool (Batch)
// ============================================================================

/**
 * Input for adding multiple nodes at once (batch operation)
 */
export interface AddNodesInput {
	/** Array of nodes to add */
	nodes: AddNodeInput[];
}

/**
 * Output from adding multiple nodes
 */
export interface AddNodesResult {
	success: boolean;
	/** Results for each node addition, in order */
	results: AddNodeResult[];
	/** Error message if the entire batch failed */
	error?: string;
}

// ============================================================================
// Connect Nodes Tool
// ============================================================================

/**
 * Input for connecting two nodes (full form)
 */
export interface ConnectNodesInputFull {
	/** The source node - can be a UUID string or an AddNodeResult object */
	sourceNodeId: NodeReference;
	/** The target node - can be a UUID string or an AddNodeResult object */
	targetNodeId: NodeReference;
	/** The index of the output to connect from (default: 0) */
	sourceOutputIndex?: number;
	/** The index of the input to connect to (default: 0) */
	targetInputIndex?: number;
}

/**
 * Short-form input for connecting two nodes (reduces tokens)
 * s=source, d=destination/target
 */
export interface ConnectNodesInputShort {
	/** Short for sourceNodeId */
	s: NodeReference;
	/** Short for targetNodeId (d = destination) */
	d: NodeReference;
	/** Short for sourceOutputIndex (optional) */
	so?: number;
	/** Short for targetInputIndex (optional) */
	di?: number;
}

/**
 * Input for connecting two nodes - accepts both full and short forms
 */
export type ConnectNodesInput = ConnectNodesInputFull | ConnectNodesInputShort;

/**
 * Normalize ConnectNodesInput to full form
 */
export function normalizeConnectNodesInput(input: ConnectNodesInput): ConnectNodesInputFull {
	if ('s' in input) {
		return {
			sourceNodeId: input.s,
			targetNodeId: input.d,
			sourceOutputIndex: input.so,
			targetInputIndex: input.di,
		};
	}
	return input;
}

/**
 * Output from connecting nodes
 */
export interface ConnectNodesResult {
	success: boolean;
	/** Name of the actual source node (may be swapped) */
	sourceNode?: string;
	/** Name of the actual target node (may be swapped) */
	targetNode?: string;
	/** The connection type (main, ai_languageModel, ai_tool, etc.) */
	connectionType?: string;
	/** Whether nodes were swapped from the original input */
	swapped?: boolean;
	/** Error message if failed */
	error?: string;
}

// ============================================================================
// Connect Multiple Nodes Tool (Batch)
// ============================================================================

/**
 * Input for connecting multiple node pairs at once (batch operation)
 */
export interface ConnectMultipleInput {
	/** Array of connections to create */
	connections: ConnectNodesInput[];
}

/**
 * Output from connecting multiple node pairs
 */
export interface ConnectMultipleResult {
	success: boolean;
	/** Results for each connection, in order */
	results: ConnectNodesResult[];
	/** Error message if the entire batch failed */
	error?: string;
}

// ============================================================================
// Remove Node Tool
// ============================================================================

/**
 * Input for removing a node
 */
export interface RemoveNodeInput {
	/** The ID of the node to remove from the workflow */
	nodeId: string;
}

/**
 * Output from removing a node
 */
export interface RemoveNodeResult {
	success: boolean;
	/** The ID of the removed node */
	removedNodeId?: string;
	/** The name of the removed node */
	removedNodeName?: string;
	/** The type of the removed node */
	removedNodeType?: string;
	/** Number of connections that were also removed */
	connectionsRemoved?: number;
	/** Error message if failed */
	error?: string;
}

// ============================================================================
// Remove Connection Tool
// ============================================================================

/**
 * Input for removing a connection
 */
export interface RemoveConnectionInput {
	/** The source node - can be a UUID string, node name, or AddNodeResult object */
	sourceNodeId: NodeReference;
	/** The target node - can be a UUID string, node name, or AddNodeResult object */
	targetNodeId: NodeReference;
	/** The connection type (main, ai_languageModel, etc.) - optional, will be inferred if not provided */
	connectionType?: string;
	/** The index of the source output (default: 0) */
	sourceOutputIndex?: number;
	/** The index of the target input (default: 0) */
	targetInputIndex?: number;
}

/**
 * Output from removing a connection
 */
export interface RemoveConnectionResult {
	success: boolean;
	/** Error message if failed */
	error?: string;
}

// ============================================================================
// Rename Node Tool
// ============================================================================

/**
 * Input for renaming a node
 */
export interface RenameNodeInput {
	/** The ID of the node to rename */
	nodeId: string;
	/** The new name for the node */
	newName: string;
}

/**
 * Output from renaming a node
 */
export interface RenameNodeResult {
	success: boolean;
	/** The old name of the node */
	oldName?: string;
	/** The new name of the node */
	newName?: string;
	/** Error message if failed */
	error?: string;
}

// ============================================================================
// Validate Structure Tool
// ============================================================================

/**
 * Input for validating workflow structure (no parameters required)
 */
export type ValidateStructureInput = Record<string, never>;

/**
 * Output from validating workflow structure
 */
export interface ValidateStructureResult {
	success: boolean;
	/** Whether the workflow structure is valid */
	isValid: boolean;
	/** List of validation issues found */
	issues?: string[];
	/** Error message if validation itself failed */
	error?: string;
}

// ============================================================================
// Update Node Parameters Tool
// ============================================================================

/**
 * Input for updating node parameters using natural language
 */
export interface UpdateNodeParametersInput {
	/** The ID of the node to update */
	nodeId: string;
	/** Natural language descriptions of changes to make */
	changes: string[];
}

/**
 * Output from updating node parameters
 */
export interface UpdateNodeParametersResult {
	success: boolean;
	/** The updated parameters object */
	updatedParameters?: INodeParameters;
	/** List of changes that were applied */
	appliedChanges?: string[];
	/** Error message if failed */
	error?: string;
}

// ============================================================================
// Set Node Parameters Tool (Direct - No LLM)
// ============================================================================

/**
 * Input for directly setting node parameters
 */
export interface SetParametersInput {
	/** The ID of the node to update - can be UUID or AddNodeResult */
	nodeId: NodeReference;
	/** Parameters to set/merge on the node (direct object) */
	params: INodeParameters;
	/** If true, replaces all parameters. If false (default), merges with existing */
	replace?: boolean;
}

/**
 * Output from directly setting node parameters
 */
export interface SetParametersResult {
	success: boolean;
	/** The final parameters after update */
	parameters?: INodeParameters;
	/** Error message if failed */
	error?: string;
}

// ============================================================================
// Batch Set Parameters Tool (Direct - No LLM)
// ============================================================================

/**
 * Input for batch setting parameters on multiple nodes (bypasses LLM)
 */
export interface BatchSetParametersInput {
	/** Array of parameter updates */
	updates: SetParametersInput[];
}

/**
 * Output from batch setting parameters
 */
export interface BatchSetParametersResult {
	success: boolean;
	/** Results for each update in order */
	results: SetParametersResult[];
	/** Error message if the entire batch failed */
	error?: string;
}

// ============================================================================
// Batch Update Parameters Tool (LLM-based)
// ============================================================================

/**
 * Input for batch updating parameters with LLM (single LLM call for multiple nodes)
 */
export interface BatchUpdateParametersInput {
	/** Array of node updates with natural language changes */
	updates: UpdateNodeParametersInput[];
}

/**
 * Output from batch updating parameters
 */
export interface BatchUpdateParametersResult {
	success: boolean;
	/** Results for each update in order */
	results: UpdateNodeParametersResult[];
	/** Error message if the entire batch failed */
	error?: string;
}

// ============================================================================
// Get Node Parameter Tool
// ============================================================================

/**
 * Input for getting a specific node parameter value
 */
export interface GetNodeParameterInput {
	/** The ID of the node to get parameter from */
	nodeId: string;
	/** The path to the parameter (e.g., "options.baseUrl" or "hasOutputParser") */
	path: string;
}

/**
 * Output from getting a node parameter
 */
export interface GetNodeParameterResult {
	success: boolean;
	/** The parameter value (can be any type) */
	value?: unknown;
	/** Error message if failed */
	error?: string;
}

// ============================================================================
// Validate Configuration Tool
// ============================================================================

/**
 * Input for validating node configuration (no parameters required)
 */
export type ValidateConfigurationInput = Record<string, never>;

/**
 * Output from validating node configuration
 */
export interface ValidateConfigurationResult {
	success: boolean;
	/** Whether all node configurations are valid */
	isValid: boolean;
	/** List of configuration issues found */
	issues?: string[];
	/** Error message if validation itself failed */
	error?: string;
}

// ============================================================================
// Script Execution Types
// ============================================================================

/**
 * Result wrapper for all tool operations in script context
 */
export interface ToolResult<T> {
	success: boolean;
	data?: T;
	error?: string;
}

/**
 * Workflow node information available in script context
 */
export interface WorkflowNodeInfo {
	id: string;
	name: string;
	type: string;
	position: [number, number];
	parameters: INodeParameters;
}

/**
 * Workflow connection information available in script context
 */
export interface WorkflowConnectionInfo {
	sourceNode: string;
	targetNode: string;
	sourceOutput: number;
	targetInput: number;
	type: string;
}

/**
 * Read-only workflow state available in script context
 */
export interface WorkflowSnapshot {
	/** Name of the workflow */
	name: string;
	/** All nodes in the workflow */
	nodes: WorkflowNodeInfo[];
	/** All connections in the workflow */
	connections: WorkflowConnectionInfo[];
	/** Find a node by ID */
	getNodeById(nodeId: string): WorkflowNodeInfo | undefined;
	/** Find a node by name */
	getNodeByName(nodeName: string): WorkflowNodeInfo | undefined;
	/** Get all nodes of a specific type */
	getNodesByType(nodeType: string): WorkflowNodeInfo[];
}

/**
 * Tools available in script execution context
 */
export interface ScriptTools {
	/**
	 * Add a node to the workflow
	 * @param input Node creation parameters (full or short form)
	 * @returns Result with nodeId on success
	 */
	addNode(input: AddNodeInput): Promise<AddNodeResult>;

	/**
	 * Add multiple nodes to the workflow in a single operation.
	 * More efficient than calling addNode multiple times.
	 * @param input Array of node creation parameters
	 * @returns Results for each node in order
	 */
	addNodes(input: AddNodesInput): Promise<AddNodesResult>;

	/** Alias for addNodes - shorter name for reduced token usage */
	add(input: AddNodesInput): Promise<AddNodesResult>;

	/**
	 * Connect two nodes in the workflow
	 * @param input Connection parameters (full or short form)
	 * @returns Result with connection info on success
	 */
	connectNodes(input: ConnectNodesInput): Promise<ConnectNodesResult>;

	/**
	 * Connect multiple node pairs in a single operation.
	 * More efficient than calling connectNodes multiple times.
	 * @param input Array of connection parameters
	 * @returns Results for each connection in order
	 */
	connectMultiple(input: ConnectMultipleInput): Promise<ConnectMultipleResult>;

	/** Alias for connectMultiple - shorter name for reduced token usage */
	conn(input: ConnectMultipleInput): Promise<ConnectMultipleResult>;

	/**
	 * Remove a node from the workflow
	 * @param input Node removal parameters
	 * @returns Result with removal info on success
	 */
	removeNode(input: RemoveNodeInput): Promise<RemoveNodeResult>;

	/**
	 * Remove a connection between nodes
	 * @param input Connection removal parameters
	 * @returns Result indicating success/failure
	 */
	removeConnection(input: RemoveConnectionInput): Promise<RemoveConnectionResult>;

	/**
	 * Rename a node in the workflow
	 * @param input Rename parameters
	 * @returns Result with old/new names on success
	 */
	renameNode(input: RenameNodeInput): Promise<RenameNodeResult>;

	/**
	 * Validate the workflow structure
	 * @returns Result with validation status and any issues
	 */
	validateStructure(): Promise<ValidateStructureResult>;

	/**
	 * Update node parameters using natural language instructions (uses LLM)
	 * @param input Node ID and natural language changes
	 * @returns Result with updated parameters on success
	 */
	updateNodeParameters(input: UpdateNodeParametersInput): Promise<UpdateNodeParametersResult>;

	/**
	 * Batch update multiple nodes' parameters with LLM (fewer LLM calls)
	 * @param input Array of node updates with natural language changes
	 * @returns Results for each update in order
	 */
	updateAll(input: BatchUpdateParametersInput): Promise<BatchUpdateParametersResult>;

	/**
	 * Directly set node parameters (use when you know the exact parameter structure)
	 * @param input Node ID and parameters object to set
	 * @returns Result with final parameters on success
	 */
	setParameters(input: SetParametersInput): Promise<SetParametersResult>;

	/** Alias for setParameters - shorter name for reduced token usage */
	set(input: SetParametersInput): Promise<SetParametersResult>;

	/**
	 * Batch set parameters on multiple nodes (use when you know the parameter structures)
	 * @param input Array of parameter updates
	 * @returns Results for each update in order
	 */
	setAll(input: BatchSetParametersInput): Promise<BatchSetParametersResult>;

	/**
	 * Get a specific parameter value from a node
	 * @param input Node ID and parameter path
	 * @returns Result with parameter value on success
	 */
	getNodeParameter(input: GetNodeParameterInput): Promise<GetNodeParameterResult>;

	/**
	 * Validate node configurations (agent prompts, tools, $fromAI usage)
	 * @returns Result with validation status and any issues
	 */
	validateConfiguration(): Promise<ValidateConfigurationResult>;
}

/**
 * Full context available to scripts during execution
 */
export interface ScriptExecutionContext {
	/** Read-only snapshot of current workflow state */
	workflow: WorkflowSnapshot;
	/** Tools for modifying the workflow */
	tools: ScriptTools;
	/** Console-like logging interface */
	console: {
		log(...args: unknown[]): void;
		warn(...args: unknown[]): void;
		error(...args: unknown[]): void;
	};
}

/**
 * TypeScript interface definitions as strings for prompt injection.
 * These are used to show the LLM what types are available in the script context.
 * NOTE: Curly braces are doubled ({{ }}) to escape them for LangChain template parsing.
 */
export const TOOL_INTERFACE_DEFINITIONS = `
// Short-form interfaces

// Short form for adding nodes: t=type, v=version, n=name, p=params
interface AddNodeInputShort {{
  t: string;    // nodeType, e.g., "n8n-nodes-base.httpRequest"
  v?: number;   // nodeVersion (optional, defaults to latest)
  n?: string;   // name (optional)
  p?: object;   // initialParameters (optional, defaults to {{}})
}}

// Short form for connections: s=source, d=destination, so=sourceOutput, di=destInput
interface ConnectNodesInputShort {{
  s: NodeRef;   // sourceNodeId
  d: NodeRef;   // targetNodeId (d = destination)
  so?: number;  // sourceOutputIndex (default 0) - use for Switch nodes
  di?: number;  // targetInputIndex (default 0) - use for Merge nodes
}}

type NodeRef = string | AddNodeResult;

interface AddNodeResult {{
  success: boolean;
  nodeId?: string;    // UUID - use .nodeId for updateAll
  nodeName?: string;
  error?: string;
}}

// Batch operations
interface AddNodesInput {{ nodes: AddNodeInputShort[]; }}
interface ConnectMultipleInput {{ connections: ConnectNodesInputShort[]; }}

// PRIMARY: Configure nodes with natural language (REQUIRED for all nodes)
// Describe what each node should do - the system figures out exact params
interface UpdateNodeParametersInput {{
  nodeId: string;      // Use result.nodeId from add()
  changes: string[];   // Natural language descriptions
}}

// tools.updateAll() - Configure multiple nodes (RECOMMENDED)
// tools.updateNodeParameters() - Configure single node
interface BatchUpdateParametersInput {{ updates: UpdateNodeParametersInput[]; }}

// SECONDARY: Direct parameter setting (only for simple, known params)
// Only use for AI Agent systemMessage/prompt or other simple string params
interface SetParametersInput {{
  nodeId: NodeRef;
  params: object;
  replace?: boolean;
}}

// Other tools
interface RemoveNodeInput {{ nodeId: string; }}
interface RenameNodeInput {{ nodeId: string; newName: string; }}
`.trim();
