import type { INode, INodeParameters, INodeTypeDescription } from 'n8n-workflow';

/**
 * Extract current parameters from a node
 */
export function extractNodeParameters(node: INode): INodeParameters {
	return node.parameters || {};
}

/**
 * Merge new parameters with existing ones
 * New parameters take precedence over existing ones
 */
export function mergeParameters(
	existingParams: INodeParameters,
	newParams: INodeParameters,
): INodeParameters {
	// Deep merge to handle nested structures
	return deepMerge(existingParams, newParams);
}

/**
 * Deep merge two objects
 */
function deepMerge(target: INodeParameters, source: INodeParameters): INodeParameters {
	// Handle null/undefined cases
	if (!target) {
		return source || {};
	}
	if (!source) {
		return target;
	}

	const output = { ...target };

	if (isObject(target) && isObject(source)) {
		Object.keys(source).forEach((key) => {
			if (isObject(source[key] as INodeParameters)) {
				if (!target || !(key in target) || !target[key]) {
					Object.assign(output, { [key]: source[key] });
				} else {
					output[key] = deepMerge(target[key] as INodeParameters, source[key] as INodeParameters);
				}
			} else {
				Object.assign(output, { [key]: source[key] });
			}
		});
	}

	return output;
}

/**
 * Check if value is an object (not array or null)
 */
function isObject(item: unknown): item is Record<string, unknown> {
	return item !== null && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Validate that required parameters are present
 */
export function validateParameters(
	parameters: INodeParameters,
	nodeType: INodeTypeDescription,
): { valid: boolean; missingRequired: string[] } {
	const missingRequired: string[] = [];

	// Check required properties
	if (nodeType.properties) {
		for (const prop of nodeType.properties) {
			if (prop.required && !(prop.name in parameters)) {
				// Check if it has a default value
				if (!prop.default) {
					missingRequired.push(prop.name);
				}
			}
		}
	}

	return {
		valid: missingRequired.length === 0,
		missingRequired,
	};
}

/**
 * Format node definition for LLM consumption
 * Extracts relevant parameter information from node type
 */
export function formatNodeDefinition(nodeType: INodeTypeDescription): string {
	const lines: string[] = [
		`Node Type: ${nodeType.name}`,
		`Display Name: ${nodeType.displayName}`,
		`Description: ${nodeType.description}`,
		'',
		'Parameters:',
	];

	if (nodeType.properties && nodeType.properties.length > 0) {
		for (const prop of nodeType.properties) {
			lines.push(`- ${prop.name}:`);
			lines.push(`  Type: ${prop.type}`);
			lines.push(`  Display Name: ${prop.displayName}`);
			if (prop.description) {
				lines.push(`  Description: ${prop.description}`);
			}
			if (prop.required) {
				lines.push('  Required: true');
			}
			if (prop.default !== undefined) {
				lines.push(`  Default: ${JSON.stringify(prop.default)}`);
			}
			if (prop.options && Array.isArray(prop.options)) {
				lines.push(
					`  Options: ${prop.options.map((opt) => (opt as { value?: string; name?: string }).value ?? (opt as { value?: string; name?: string }).name).join(', ')}`,
				);
			}
			lines.push('');
		}
	} else {
		lines.push('No parameters defined');
	}

	return lines.join('\n');
}

/**
 * Create a copy of node with updated parameters
 */
export function updateNodeWithParameters(node: INode, newParameters: INodeParameters): INode {
	return {
		...node,
		parameters: newParameters,
	};
}

/**
 * Format changes array into a readable string for LLM
 */
export function formatChangesForPrompt(changes: string[]): string {
	return changes.map((change, index) => `${index + 1}. ${change}`).join('\n');
}
