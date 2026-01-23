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
 * Input for adding a node to the workflow
 */
export interface AddNodeInput {
	/** The type of node to add (e.g., n8n-nodes-base.httpRequest) */
	nodeType: string;
	/** The exact node version */
	nodeVersion: number;
	/** A descriptive name for the node that clearly indicates its purpose */
	name: string;
	/** Explanation of reasoning about initial parameters */
	initialParametersReasoning: string;
	/** Initial parameters to set on the node */
	initialParameters: INodeParameters;
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
// Connect Nodes Tool
// ============================================================================

/**
 * Input for connecting two nodes
 */
export interface ConnectNodesInput {
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
	 * @param input Node creation parameters
	 * @returns Result with nodeId on success
	 */
	addNode(input: AddNodeInput): Promise<AddNodeResult>;

	/**
	 * Connect two nodes in the workflow
	 * @param input Connection parameters
	 * @returns Result with connection info on success
	 */
	connectNodes(input: ConnectNodesInput): Promise<ConnectNodesResult>;

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
// Input/Output interfaces for script tools

interface AddNodeInput {{
  nodeType: string;        // e.g., "n8n-nodes-base.httpRequest"
  nodeVersion: number;     // The exact version number
  name: string;            // Descriptive name for the node
  initialParametersReasoning: string;  // Explain your parameter choices
  initialParameters: object;  // Initial parameters (use {{}} if none needed)
}}

interface AddNodeResult {{
  success: boolean;
  nodeId?: string;         // UUID of created node - USE THIS FOR CONNECTIONS
  nodeName?: string;       // Assigned name (may differ if name was taken)
  nodeType?: string;
  displayName?: string;
  position?: [number, number];
  error?: string;
}}

interface ConnectNodesInput {{
  sourceNodeId: string | AddNodeResult;  // UUID string OR result from addNode directly
  targetNodeId: string | AddNodeResult;  // UUID string OR result from addNode directly
  sourceOutputIndex?: number;  // Default: 0
  targetInputIndex?: number;   // Default: 0
}}

interface ConnectNodesResult {{
  success: boolean;
  sourceNode?: string;     // Actual source (may be swapped for AI connections)
  targetNode?: string;     // Actual target (may be swapped for AI connections)
  connectionType?: string; // main, ai_languageModel, ai_tool, etc.
  swapped?: boolean;
  error?: string;
}}

interface RemoveNodeInput {{
  nodeId: string;
}}

interface RemoveConnectionInput {{
  sourceNodeId: string | AddNodeResult;  // UUID, node name, or result from addNode
  targetNodeId: string | AddNodeResult;  // UUID, node name, or result from addNode
  connectionType?: string;  // Default: 'main'
  sourceOutputIndex?: number;  // Default: 0
  targetInputIndex?: number;   // Default: 0
}}

interface RenameNodeInput {{
  nodeId: string;
  newName: string;
}}
`.trim();
