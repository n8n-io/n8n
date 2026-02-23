import type { INodeTypes, IConnections as N8nIConnections, IDisplayOptions } from 'n8n-workflow';
import { mapConnectionsByDestination } from 'n8n-workflow';

import { matchesDisplayOptions } from './display-options';
import type { DisplayOptions, DisplayOptionsContext } from './display-options';
import { resolveMainInputCount } from './input-resolver';
import { validateNodeConfig } from './schema-validator';
import { isStickyNoteType, isHttpRequestType } from '../constants/node-types';
import type { WorkflowBuilder, WorkflowJSON } from '../types/base';

export { setSchemaBaseDirs } from './schema-validator';

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
	| 'INVALID_PARAMETER'
	| 'INVALID_INPUT_INDEX'
	| 'SUBNODE_NOT_CONNECTED'
	| 'SUBNODE_PARAMETER_MISMATCH'
	| 'UNSUPPORTED_SUBNODE_INPUT'
	| 'MAX_NODES_EXCEEDED'
	| 'INVALID_EXPRESSION_PATH'
	| 'PARTIAL_EXPRESSION_PATH'
	| 'INVALID_DATE_METHOD';

/**
 * Validation error class
 */
export class ValidationError {
	readonly code: ValidationErrorCode;
	readonly message: string;
	readonly nodeName?: string;
	readonly parameterName?: string;
	/** Violation level for evaluation scoring (defaults to 'minor' if not set) */
	readonly violationLevel?: 'critical' | 'major' | 'minor';

	constructor(
		code: ValidationErrorCode,
		message: string,
		nodeName?: string,
		parameterName?: string,
		violationLevel?: 'critical' | 'major' | 'minor',
	) {
		this.code = code;
		this.message = message;
		this.nodeName = nodeName;
		this.parameterName = parameterName;
		this.violationLevel = violationLevel;
	}
}

/**
 * Validation warning class (non-fatal issues)
 */
export class ValidationWarning {
	readonly code: ValidationErrorCode;
	readonly message: string;
	readonly nodeName?: string;
	readonly parameterPath?: string;
	readonly originalName?: string;
	/** Violation level for evaluation scoring (defaults to 'minor' if not set) */
	readonly violationLevel?: 'critical' | 'major' | 'minor';

	constructor(
		code: ValidationErrorCode,
		message: string,
		nodeName?: string,
		parameterPath?: string,
		originalName?: string,
		violationLevel?: 'critical' | 'major' | 'minor',
	) {
		this.code = code;
		this.message = message;
		this.nodeName = nodeName;
		this.parameterPath = parameterPath;
		this.originalName = originalName;
		this.violationLevel = violationLevel;
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
	/** Optional node types provider for dynamic input index validation */
	nodeTypesProvider?: INodeTypes;
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
	ai_document: 'documentLoader',
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
 * Check if a node is used as a tool (connected via ai_tool connection type)
 */
function isToolSubnode(nodeName: string, json: WorkflowJSON): boolean {
	const nodeConnections = json.connections[nodeName];
	if (!nodeConnections) return false;

	const toolConns = nodeConnections.ai_tool as unknown as Array<Array<{ node: string }>>;
	if (toolConns && Array.isArray(toolConns)) {
		for (const outputs of toolConns) {
			if (outputs && outputs.length > 0) {
				return true; // Connected as a tool
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
		if (isStickyNoteType(node.type)) continue;

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
 * const wf = workflow('id', 'Test').add(trigger(...)).to(node(...));
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
			if (isHttpRequestType(node.type)) {
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

			// Determine if this node is being used as a tool (for @tool displayOptions)
			// A node is a tool if it's connected via ai_tool connection type
			const isToolNode = node.name ? isToolSubnode(node.name, json) : false;

			const schemaResult = validateNodeConfig(node.type, version, config, { isToolNode });

			if (!schemaResult.valid) {
				for (const error of schemaResult.errors) {
					let message = error.message;

					// Enhance subnode errors with valid options when nodeTypesProvider is available
					if (
						error.path === 'subnodes' &&
						message.includes('Unknown field') &&
						options.nodeTypesProvider
					) {
						const nodeType = options.nodeTypesProvider.getByNameAndVersion(node.type, version);
						const validInputs = nodeType?.description?.builderHint?.inputs;
						if (validInputs) {
							const validSubnodes = Object.keys(validInputs)
								.map((k) => AI_CONNECTION_TO_SUBNODE_FIELD[k])
								.filter(Boolean);
							if (validSubnodes.length > 0) {
								// Transform message from "Unknown field(s) at "subnodes": "x", "y"."
								// to "Invalid subnode(s) "x", "y". This node only accepts: a, b."
								message = message.replace(
									/Unknown field\(s\) at "subnodes": (.+)\./,
									`Invalid subnode(s) $1. This node only accepts: ${validSubnodes.join(', ')}.`,
								);
							}
						}
					}

					// Report as WARNING (non-blocking) to maintain backwards compatibility
					warnings.push(
						new ValidationWarning(
							'INVALID_PARAMETER',
							`Node "${node.name}": ${message}`,
							node.name,
						),
					);
				}
			}
		}
	}

	// Input index validation (only if provider is given)
	if (options.nodeTypesProvider) {
		checkNodeInputIndices(json, options.nodeTypesProvider, warnings);
		// Validate subnode parameters match parent's displayOptions requirements
		validateSubnodeParameters(json, options.nodeTypesProvider, warnings);
		// Validate parent nodes actually support their connected AI input types
		validateParentSupportsInputs(json, options.nodeTypesProvider, warnings);
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Mapping from AI connection type to SDK function name (for error messages)
 */
const AI_CONNECTION_TO_SDK_FUNCTION: Record<string, string> = {
	ai_languageModel: 'languageModel()',
	ai_memory: 'memory()',
	ai_tool: 'tool()',
	ai_outputParser: 'outputParser()',
	ai_embedding: 'embeddings()',
	ai_vectorStore: 'vectorStore()',
	ai_retriever: 'retriever()',
	ai_document: 'documentLoader()',
	ai_textSplitter: 'textSplitter()',
	ai_reranker: 'reranker()',
};

/**
 * Check if a subnode's parameters satisfy displayOptions conditions
 */
function checkDisplayOptionsMatch(
	subnodeParams: Record<string, unknown>,
	displayOptions: IDisplayOptions,
): {
	matches: boolean;
	mismatches: Array<{ param: string; expected: unknown[]; actual: unknown }>;
} {
	const mismatches: Array<{ param: string; expected: unknown[]; actual: unknown }> = [];

	if (!displayOptions.show) return { matches: true, mismatches };

	for (const [paramName, expectedValues] of Object.entries(displayOptions.show)) {
		if (!expectedValues) continue; // Skip undefined values
		const actualValue = subnodeParams[paramName];
		if (!expectedValues.includes(actualValue as never)) {
			mismatches.push({
				param: paramName,
				expected: expectedValues as unknown[],
				actual: actualValue,
			});
		}
	}

	return { matches: mismatches.length === 0, mismatches };
}

/**
 * Validate that subnodes connected to parent nodes have parameters
 * matching the displayOptions conditions in builderHint.inputs.
 *
 * For example, if an Agent's ai_tool input has displayOptions.show = { mode: ['retrieve-as-tool'] },
 * then any node connected via ai_tool must have mode='retrieve-as-tool'.
 */
function validateSubnodeParameters(
	json: WorkflowJSON,
	nodeTypesProvider: INodeTypes,
	warnings: ValidationWarning[],
): void {
	// Build a map of node name -> node for quick lookup
	const nodesByName = new Map<string, NodeJSON>();
	for (const node of json.nodes) {
		if (node.name) {
			nodesByName.set(node.name, node);
		}
	}

	// Invert connections to find incoming connections by destination
	// Cast to n8n-workflow IConnections since our local type has string for connection type
	const connectionsByDest = mapConnectionsByDestination(
		json.connections as unknown as N8nIConnections,
	);

	// Check each node that might be a parent with AI inputs
	for (const parentNode of json.nodes) {
		if (!parentNode.name) continue;

		// Try to get the node type to check for builderHint.inputs
		const parentNodeType = nodeTypesProvider.getByNameAndVersion(
			parentNode.type,
			typeof parentNode.typeVersion === 'string'
				? parseFloat(parentNode.typeVersion)
				: (parentNode.typeVersion ?? 1),
		);
		const builderHintInputs = parentNodeType?.description?.builderHint?.inputs;
		if (!builderHintInputs) continue;

		// For each AI input type the parent accepts
		for (const [connectionType, inputConfig] of Object.entries(builderHintInputs)) {
			if (!connectionType.startsWith('ai_')) continue;
			if (!inputConfig?.displayOptions?.show) continue;

			// Find subnodes connected via this type
			const incomingConnections = connectionsByDest[parentNode.name]?.[connectionType];
			if (!incomingConnections) continue;

			for (const connList of incomingConnections) {
				if (!connList) continue;
				for (const conn of connList) {
					const subnodeName = conn.node;
					const subnode = nodesByName.get(subnodeName);
					if (!subnode?.parameters) continue;

					// Check if subnode params match displayOptions conditions
					const { matches, mismatches } = checkDisplayOptionsMatch(
						subnode.parameters,
						inputConfig.displayOptions,
					);

					if (!matches) {
						const sdkFn = AI_CONNECTION_TO_SDK_FUNCTION[connectionType] || connectionType;

						// Build error message with actual parameter names from displayOptions
						const mismatchDetails = mismatches
							.map(
								(m) =>
									`${m.param}='${String(m.actual)}' (expected: ${m.expected.map((v) => `'${String(v)}'`).join(' or ')})`,
							)
							.join(', ');

						warnings.push(
							new ValidationWarning(
								'SUBNODE_PARAMETER_MISMATCH',
								`'${subnodeName}' is connected to '${parentNode.name}' using ${sdkFn} but has ${mismatchDetails}. Update parameters to match the SDK function used.`,
								subnodeName,
								mismatches[0]?.param,
							),
						);
					}
				}
			}
		}
	}
}

/**
 * Build a human-readable summary of which displayOptions conditions are not met.
 */
function buildConditionSummary(
	displayOptions: IDisplayOptions,
	parentParams: Record<string, unknown>,
): string {
	if (!displayOptions.show) return '';

	const parts: string[] = [];
	for (const [paramName, expectedValues] of Object.entries(displayOptions.show)) {
		if (!expectedValues) continue;
		const actual = parentParams[paramName];
		const expectedStr = (expectedValues as unknown[]).map((v) => `'${String(v)}'`).join(' or ');
		parts.push(`${paramName} should be ${expectedStr} (currently '${String(actual)}')`);
	}

	return parts.length > 0 ? `Required: ${parts.join(', ')}.` : '';
}

/**
 * Validate that parent nodes actually support their connected AI input types
 * based on the parent's own parameters and builderHint.inputs displayOptions.
 *
 * For example, if a vector store has mode='retrieve' but a documentLoader is connected,
 * this produces a warning because ai_document requires mode='insert'.
 */
function validateParentSupportsInputs(
	json: WorkflowJSON,
	nodeTypesProvider: INodeTypes,
	warnings: ValidationWarning[],
): void {
	const nodesByName = new Map<string, NodeJSON>();
	for (const node of json.nodes) {
		if (node.name) {
			nodesByName.set(node.name, node);
		}
	}

	const connectionsByDest = mapConnectionsByDestination(
		json.connections as unknown as N8nIConnections,
	);

	for (const parentNode of json.nodes) {
		if (!parentNode.name) continue;

		const version =
			typeof parentNode.typeVersion === 'string'
				? parseFloat(parentNode.typeVersion)
				: (parentNode.typeVersion ?? 1);

		const parentNodeType = nodeTypesProvider.getByNameAndVersion(parentNode.type, version);
		const builderHintInputs = parentNodeType?.description?.builderHint?.inputs;
		if (!builderHintInputs) continue;

		const parentContext: DisplayOptionsContext = {
			parameters: (parentNode.parameters ?? {}) as Record<string, unknown>,
			nodeVersion: version,
			rootParameters: (parentNode.parameters ?? {}) as Record<string, unknown>,
		};

		for (const [connectionType, inputConfig] of Object.entries(builderHintInputs)) {
			if (!connectionType.startsWith('ai_')) continue;
			if (!inputConfig?.displayOptions) continue;

			const parentSupportsInput = matchesDisplayOptions(
				parentContext,
				inputConfig.displayOptions as DisplayOptions,
			);

			if (parentSupportsInput) continue;

			const incomingConnections = connectionsByDest[parentNode.name]?.[connectionType];
			if (!incomingConnections) continue;

			for (const connList of incomingConnections) {
				if (!connList) continue;
				for (const conn of connList) {
					const subnodeName = conn.node;
					const subnodeField = AI_CONNECTION_TO_SUBNODE_FIELD[connectionType] || connectionType;
					const conditionDetails = buildConditionSummary(
						inputConfig.displayOptions,
						(parentNode.parameters ?? {}) as Record<string, unknown>,
					);

					warnings.push(
						new ValidationWarning(
							'UNSUPPORTED_SUBNODE_INPUT',
							`'${subnodeName}' is connected to '${parentNode.name}' as ${subnodeField}, but '${parentNode.name}' does not support ${subnodeField} in its current configuration. ${conditionDetails}`,
							parentNode.name,
							undefined,
							undefined,
							'major',
						),
					);
				}
			}
		}
	}
}

/**
 * Check if connections use valid input indices for their target nodes.
 * Reports warnings for connections to input indices that don't exist.
 */
function checkNodeInputIndices(
	json: WorkflowJSON,
	nodeTypesProvider: INodeTypes,
	warnings: ValidationWarning[],
): void {
	// Build a map of node name -> node for quick lookup
	const nodesByName = new Map<string, NodeJSON>();
	for (const node of json.nodes) {
		if (node.name) {
			nodesByName.set(node.name, node);
		}
	}

	// Track which (nodeName, inputIndex) pairs we've already warned about
	// to avoid duplicate warnings when multiple sources connect to the same invalid input
	const warnedInputs = new Set<string>();

	// Scan all connections to check input indices
	for (const [_sourceName, nodeConnections] of Object.entries(json.connections)) {
		// Only check main connections (not AI connections)
		const mainConnections = nodeConnections.main;
		if (!mainConnections || !Array.isArray(mainConnections)) continue;

		for (const outputs of mainConnections) {
			if (!outputs) continue;
			for (const conn of outputs) {
				const targetNodeName = conn.node;
				const targetInputIndex = conn.index;

				const targetNode = nodesByName.get(targetNodeName);
				if (!targetNode) continue;

				// Get version number
				const version =
					typeof targetNode.typeVersion === 'string'
						? parseFloat(targetNode.typeVersion)
						: (targetNode.typeVersion ?? 1);

				// Resolve the number of main inputs for this node type
				const mainInputCount = resolveMainInputCount(nodeTypesProvider, targetNode.type, version);

				// If we couldn't resolve (dynamic inputs or unknown node), skip validation
				if (mainInputCount === undefined) continue;

				// Check if the input index is valid
				if (targetInputIndex >= mainInputCount) {
					const warnKey = `${targetNodeName}:${targetInputIndex}`;
					if (!warnedInputs.has(warnKey)) {
						warnedInputs.add(warnKey);
						warnings.push(
							new ValidationWarning(
								'INVALID_INPUT_INDEX',
								`Connection to '${targetNodeName}' uses input index ${targetInputIndex}, but node only has ${mainInputCount} input(s) (indices 0-${mainInputCount - 1})`,
								targetNodeName,
							),
						);
					}
				}
			}
		}
	}
}
