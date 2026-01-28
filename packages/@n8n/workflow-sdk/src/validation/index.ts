import type { WorkflowBuilder, WorkflowJSON } from '../types/base';
import { validateNodeConfig } from './schema-validator';

/**
 * Validation error codes
 */
export type ValidationErrorCode =
	| 'NO_NODES'
	| 'MISSING_TRIGGER'
	| 'DISCONNECTED_NODE'
	| 'MISSING_PARAMETER'
	| 'INVALID_CONNECTION'
	| 'CIRCULAR_REFERENCE'
	| 'INVALID_EXPRESSION'
	| 'AGENT_STATIC_PROMPT'
	| 'AGENT_NO_SYSTEM_MESSAGE'
	| 'HARDCODED_CREDENTIALS'
	| 'SET_CREDENTIAL_FIELD'
	| 'MERGE_SINGLE_INPUT'
	| 'TOOL_NO_PARAMETERS'
	| 'FROM_AI_IN_NON_TOOL'
	| 'MISSING_EXPRESSION_PREFIX'
	| 'INVALID_PARAMETER';

/**
 * Validation error class
 */
export class ValidationError {
	readonly code: ValidationErrorCode;
	readonly message: string;
	readonly nodeName?: string;
	readonly parameterName?: string;

	constructor(
		code: ValidationErrorCode,
		message: string,
		nodeName?: string,
		parameterName?: string,
	) {
		this.code = code;
		this.message = message;
		this.nodeName = nodeName;
		this.parameterName = parameterName;
	}
}

/**
 * Validation warning class (non-fatal issues)
 */
export class ValidationWarning {
	readonly code: ValidationErrorCode;
	readonly message: string;
	readonly nodeName?: string;

	constructor(code: ValidationErrorCode, message: string, nodeName?: string) {
		this.code = code;
		this.message = message;
		this.nodeName = nodeName;
	}
}

/**
 * Validation result
 */
export interface ValidationResult {
	/** Whether the workflow is valid */
	valid: boolean;
	/** Fatal errors that prevent the workflow from running */
	errors: ValidationError[];
	/** Warnings about potential issues */
	warnings: ValidationWarning[];
}

/**
 * Validation options
 */
export interface ValidationOptions {
	/** Enable strict mode with more warnings */
	strictMode?: boolean;
	/** Skip disconnected node warnings */
	allowDisconnectedNodes?: boolean;
	/** Skip trigger requirement */
	allowNoTrigger?: boolean;
	/** Enable/disable Zod schema validation (default: true) */
	validateSchema?: boolean;
}

/**
 * Check if a node type is a trigger
 */
function isTriggerNode(type: string): boolean {
	return (
		type.includes('Trigger') ||
		type.includes('trigger') ||
		type.includes('Webhook') ||
		type.includes('webhook') ||
		type.includes('Schedule') ||
		type.includes('schedule') ||
		type.includes('Poll') ||
		type.includes('poll')
	);
}

/**
 * AI connection types used by subnodes to connect to their parent nodes
 */
const AI_CONNECTION_TYPES = [
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

/**
 * Mapping from AI connection type to subnodes field name
 */
const AI_CONNECTION_TO_SUBNODE_FIELD: Record<string, string> = {
	ai_languageModel: 'model',
	ai_memory: 'memory',
	ai_tool: 'tools',
	ai_outputParser: 'outputParser',
	ai_embedding: 'embedding',
	ai_vectorStore: 'vectorStore',
	ai_retriever: 'retriever',
	ai_document: 'document',
	ai_textSplitter: 'textSplitter',
	ai_reranker: 'reranker',
};

/**
 * AI connection types that should always be arrays in subnodes
 */
const AI_ARRAY_TYPES = new Set(['ai_tool']);

interface NodeJSON {
	id?: string;
	name?: string;
	type: string;
	typeVersion?: number | string;
	position?: [number, number];
	parameters?: Record<string, unknown>;
}

/**
 * Reconstruct subnodes object from AI connections in the workflow.
 * When SDK code defines subnodes, they get serialized as separate nodes with AI connections.
 * This function reverses that transformation for validation purposes.
 */
function reconstructSubnodesFromConnections(
	targetNodeName: string,
	json: WorkflowJSON,
): Record<string, unknown> | undefined {
	const subnodes: Record<string, unknown> = {};
	const nodesByName = new Map<string, NodeJSON>();

	// Build a map of node name -> node for quick lookup
	for (const node of json.nodes) {
		if (node.name) {
			nodesByName.set(node.name, node);
		}
	}

	// Scan all nodes' connections to find AI connections TO this target node
	for (const [sourceNodeName, nodeConnections] of Object.entries(json.connections)) {
		for (const connType of AI_CONNECTION_TYPES) {
			const aiConns = nodeConnections[connType as keyof typeof nodeConnections];
			if (!aiConns || !Array.isArray(aiConns)) continue;

			for (const outputs of aiConns) {
				if (!outputs) continue;
				for (const conn of outputs) {
					if (conn.node === targetNodeName) {
						// Found an AI connection to our target node
						const subnodeField = AI_CONNECTION_TO_SUBNODE_FIELD[connType];
						if (!subnodeField) continue;

						const sourceNode = nodesByName.get(sourceNodeName);
						if (!sourceNode) continue;

						// Build a minimal subnode config for validation
						const subnodeConfig = {
							type: sourceNode.type,
							version: sourceNode.typeVersion,
							parameters: sourceNode.parameters ?? {},
						};

						// For array types (like tools), collect into array
						if (AI_ARRAY_TYPES.has(connType)) {
							const existing = subnodes[subnodeField];
							if (Array.isArray(existing)) {
								existing.push(subnodeConfig);
							} else {
								subnodes[subnodeField] = [subnodeConfig];
							}
						} else {
							// For single-value types, just set directly
							subnodes[subnodeField] = subnodeConfig;
						}
					}
				}
			}
		}
	}

	// Return undefined if no subnodes were found
	return Object.keys(subnodes).length > 0 ? subnodes : undefined;
}

/**
 * Check if a node has AI connections to a parent node (making it a connected subnode)
 */
function hasAiConnectionToParent(nodeName: string, json: WorkflowJSON): boolean {
	const nodeConnections = json.connections[nodeName];
	if (!nodeConnections) return false;

	for (const connType of AI_CONNECTION_TYPES) {
		const aiConns = nodeConnections[connType as keyof typeof nodeConnections];
		if (aiConns && Array.isArray(aiConns)) {
			for (const outputs of aiConns) {
				if (outputs && outputs.length > 0) {
					return true; // Has AI connection to parent
				}
			}
		}
	}
	return false;
}

/**
 * Find disconnected nodes (nodes that don't receive input from any other node)
 */
function findDisconnectedNodes(json: WorkflowJSON): string[] {
	const hasIncoming = new Set<string>();

	// Find all nodes that have incoming connections
	for (const [_sourceName, nodeConnections] of Object.entries(json.connections)) {
		if (nodeConnections.main) {
			for (const outputs of nodeConnections.main) {
				if (outputs) {
					for (const connection of outputs) {
						hasIncoming.add(connection.node);
					}
				}
			}
		}
	}

	// Find nodes without incoming connections (excluding triggers, sticky notes, and connected subnodes)
	const disconnected: string[] = [];
	for (const node of json.nodes) {
		// Skip nodes without names (e.g., some sticky notes)
		if (!node.name) continue;

		// Skip if node has incoming connection
		if (hasIncoming.has(node.name)) continue;

		// Skip trigger nodes - they don't need incoming connections
		if (isTriggerNode(node.type)) continue;

		// Skip sticky notes - they don't participate in data flow
		if (node.type === 'n8n-nodes-base.stickyNote') continue;

		// Skip subnodes - they connect TO their parent via AI connections
		if (hasAiConnectionToParent(node.name, json)) continue;

		disconnected.push(node.name);
	}

	return disconnected;
}

/**
 * Validate a workflow
 *
 * Checks for:
 * - Presence of trigger node (warning if missing)
 * - Disconnected nodes (warning)
 * - Required parameters (in strict mode)
 *
 * @param workflow - The workflow to validate (WorkflowBuilder or WorkflowJSON)
 * @param options - Validation options
 * @returns Validation result with errors and warnings
 *
 * @example
 * ```typescript
 * const wf = workflow('id', 'Test').add(trigger(...)).then(node(...));
 * const result = validateWorkflow(wf);
 *
 * if (!result.valid) {
 *   console.error('Errors:', result.errors);
 * }
 * if (result.warnings.length > 0) {
 *   console.warn('Warnings:', result.warnings);
 * }
 * ```
 */
export function validateWorkflow(
	workflowOrJson: WorkflowBuilder | WorkflowJSON,
	options: ValidationOptions = {},
): ValidationResult {
	// Get JSON representation
	const json: WorkflowJSON = 'toJSON' in workflowOrJson ? workflowOrJson.toJSON() : workflowOrJson;

	const errors: ValidationError[] = [];
	const warnings: ValidationWarning[] = [];

	// Check for trigger node
	if (!options.allowNoTrigger) {
		const hasTrigger = json.nodes.some((node) => isTriggerNode(node.type));
		if (!hasTrigger) {
			warnings.push(
				new ValidationWarning(
					'MISSING_TRIGGER',
					'Workflow has no trigger node. It will need to be started manually.',
				),
			);
		}
	}

	// Check for disconnected nodes
	if (!options.allowDisconnectedNodes) {
		const disconnected = findDisconnectedNodes(json);
		for (const nodeName of disconnected) {
			warnings.push(
				new ValidationWarning(
					'DISCONNECTED_NODE',
					`Node '${nodeName}' is not connected to any input. It will not receive data.`,
					nodeName,
				),
			);
		}
	}

	// Strict mode validations
	if (options.strictMode) {
		// Check for potentially missing required parameters
		for (const node of json.nodes) {
			// HTTP Request should have a URL
			if (node.type === 'n8n-nodes-base.httpRequest') {
				if (!node.parameters?.url && !node.parameters?.requestUrl) {
					warnings.push(
						new ValidationWarning(
							'MISSING_PARAMETER',
							`HTTP Request node '${node.name}' may be missing URL parameter`,
							node.name,
						),
					);
				}
			}
		}
	}

	// Schema validation (enabled by default)
	if (options.validateSchema !== false) {
		for (const node of json.nodes) {
			// Get version number (handle both number and string versions)
			const version =
				typeof node.typeVersion === 'string'
					? parseFloat(node.typeVersion)
					: (node.typeVersion ?? 1);

			// Build config object for validation
			const config: { parameters?: unknown; subnodes?: unknown } = {};
			if (node.parameters !== undefined) {
				config.parameters = node.parameters;
			}
			// Include subnodes if present (for AI nodes)
			const nodeWithSubnodes = node as typeof node & { subnodes?: unknown };
			if (nodeWithSubnodes.subnodes !== undefined) {
				config.subnodes = nodeWithSubnodes.subnodes;
			} else if (node.name) {
				// Try to reconstruct subnodes from AI connections in the workflow
				// This handles the case where subnodes were serialized as separate nodes
				const reconstructed = reconstructSubnodesFromConnections(node.name, json);
				if (reconstructed) {
					config.subnodes = reconstructed;
				}
			}

			const schemaResult = validateNodeConfig(node.type, version, config);

			if (!schemaResult.valid) {
				for (const error of schemaResult.errors) {
					// Report as WARNING (non-blocking) to maintain backwards compatibility
					warnings.push(
						new ValidationWarning(
							'INVALID_PARAMETER',
							`Node "${node.name}": ${error.message}`,
							node.name,
						),
					);
				}
			}
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}
