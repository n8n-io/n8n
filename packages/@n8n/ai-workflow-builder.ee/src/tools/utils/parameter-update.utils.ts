import type { INode, INodeParameters } from 'n8n-workflow';

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

/**
 * Fix expression prefixes in parameters
 * Ensures expressions containing {{ are properly prefixed with =
 */
export function fixExpressionPrefixes<T>(value: T): T {
	// Handle string values
	if (typeof value === 'string') {
		let updatedValue = value as string;
		// Replace {{ $json }} with {{ $json.toJsonString() }}
		if (value.includes('{{ $json }}')) {
			updatedValue = value.replace('{{ $json }}', '{{ $json.toJsonString() }}');
		}
		if (updatedValue.includes('{{') && !updatedValue.startsWith('=')) {
			return ('=' + updatedValue) as T;
		}
	}

	// Handle array values
	if (Array.isArray(value)) {
		return value.map((item: unknown) => fixExpressionPrefixes(item)) as T;
	}

	// Handle object values (but not null)
	if (value !== null && typeof value === 'object') {
		const fixed: Record<string, unknown> = {};
		for (const key in value) {
			if (Object.prototype.hasOwnProperty.call(value, key)) {
				fixed[key] = fixExpressionPrefixes((value as Record<string, unknown>)[key]);
			}
		}
		return fixed as T;
	}

	// Return other types unchanged (number, boolean, null, undefined)
	return value;
}
