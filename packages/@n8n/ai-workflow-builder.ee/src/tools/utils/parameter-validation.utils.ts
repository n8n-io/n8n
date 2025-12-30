import type { INode, INodeTypeDescription, INodeParameters, INodeIssues } from 'n8n-workflow';
import { displayParameter, getNodeParametersIssues } from 'n8n-workflow';

/**
 * Result of parameter validation
 */
export interface ValidationResult {
	/** Whether all required visible parameters are valid */
	valid: boolean;
	/** Detailed validation issues, if any */
	issues: INodeIssues | null;
	/** List of parameter names that are currently visible */
	visibleParameters: string[];
	/** List of parameter names that are currently hidden */
	hiddenParameters: string[];
	/** List of required parameters that are missing values */
	missingRequired: string[];
}

/**
 * Get list of visible parameters based on current parameter values.
 * Uses n8n's displayParameter() to check display options.
 */
export function getVisibleParameters(
	nodeTypeDescription: INodeTypeDescription,
	nodeValues: INodeParameters,
	node: Pick<INode, 'typeVersion'>,
): string[] {
	const visible: string[] = [];

	for (const property of nodeTypeDescription.properties) {
		if (displayParameter(nodeValues, property, node, nodeTypeDescription, nodeValues)) {
			visible.push(property.name);
		}
	}

	return visible;
}

/**
 * Validate parameters considering display options.
 * Uses n8n's built-in validation utilities to check:
 * - Required fields that are visible have values
 * - Field types match expected types
 * - Display options are respected
 *
 * @param node - The node being validated
 * @param nodeTypeDescription - Node type definition with properties
 * @param parameters - Parameters to validate
 * @returns ValidationResult with details about validation status
 */
export function validateParametersWithDisplayOptions(
	node: INode,
	nodeTypeDescription: INodeTypeDescription,
	parameters: INodeParameters,
): ValidationResult {
	// Get visible parameters
	const visibleParameters = getVisibleParameters(nodeTypeDescription, parameters, node);

	// Get hidden parameters
	const allParameterNames = nodeTypeDescription.properties.map((p) => p.name);
	const hiddenParameters = allParameterNames.filter((name) => !visibleParameters.includes(name));

	// Create a node-like object with the parameters for validation
	const nodeWithParams = {
		...node,
		parameters,
	};

	// Get parameter issues using n8n's validation
	const issues = getNodeParametersIssues(
		nodeTypeDescription.properties,
		nodeWithParams,
		nodeTypeDescription,
	);

	// Extract missing required parameters from issues
	const missingRequired: string[] = [];
	if (issues?.parameters) {
		for (const [paramName, paramIssues] of Object.entries(issues.parameters)) {
			if (paramIssues.some((issue) => issue.toLowerCase().includes('required'))) {
				missingRequired.push(paramName);
			}
		}
	}

	return {
		valid: issues === null || Object.keys(issues.parameters ?? {}).length === 0,
		issues,
		visibleParameters,
		hiddenParameters,
		missingRequired,
	};
}

/**
 * Format validation issues into a human-readable string for LLM feedback.
 * This helps the LLM understand what parameters need to be fixed.
 *
 * @param result - ValidationResult from validateParametersWithDisplayOptions
 * @returns Human-readable string describing the issues
 */
export function formatValidationIssuesForLLM(result: ValidationResult): string {
	if (result.valid) {
		return 'All parameters are valid.';
	}

	const messages: string[] = [];

	if (result.missingRequired.length > 0) {
		messages.push(`Missing required parameters: ${result.missingRequired.join(', ')}`);
	}

	if (result.issues?.parameters) {
		for (const [param, issueList] of Object.entries(result.issues.parameters)) {
			for (const issue of issueList) {
				// Skip "required" messages as they're already captured above
				if (!issue.toLowerCase().includes('required')) {
					messages.push(`${param}: ${issue}`);
				}
			}
		}
	}

	return messages.length > 0 ? messages.join('\n') : 'Unknown validation issues';
}
