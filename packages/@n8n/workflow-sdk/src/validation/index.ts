import type { WorkflowBuilder, WorkflowJSON } from '../types/base';

/**
 * Validation error codes
 */
export type ValidationErrorCode =
	| 'MISSING_TRIGGER'
	| 'DISCONNECTED_NODE'
	| 'MISSING_PARAMETER'
	| 'INVALID_CONNECTION'
	| 'CIRCULAR_REFERENCE'
	| 'INVALID_EXPRESSION';

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

	// Find nodes without incoming connections (excluding triggers)
	const disconnected: string[] = [];
	for (const node of json.nodes) {
		if (!hasIncoming.has(node.name) && !isTriggerNode(node.type)) {
			disconnected.push(node.name);
		}
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

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}
