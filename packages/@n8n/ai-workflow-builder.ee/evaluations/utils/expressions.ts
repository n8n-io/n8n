import type { INodeParameters } from 'n8n-workflow';
import { isExpression } from 'n8n-workflow';

/**
 * Checks if a string contains n8n expressions referencing other data
 */
export function containsExpression(value: unknown): boolean {
	if (!isExpression(value)) {
		return false;
	}

	// Check for n8n expression patterns: $(...) of $something inside ={{...}}
	return /\{\{.*(\$\(.*?\))|(\$\w+).*}}/.test(value);
}

/**
 * Recursively checks if any parameter in the node contains expressions
 */
export function nodeParametersContainExpression(parameters: INodeParameters): boolean {
	for (const value of Object.values(parameters)) {
		if (containsExpression(value)) {
			return true;
		}

		// Recursively check nested objects
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			if (nodeParametersContainExpression(value as INodeParameters)) {
				return true;
			}
		}

		// Check arrays
		if (Array.isArray(value)) {
			for (const item of value) {
				if (containsExpression(item)) {
					return true;
				}
				// Check nested objects in arrays
				if (item && typeof item === 'object') {
					if (nodeParametersContainExpression(item as INodeParameters)) {
						return true;
					}
				}
			}
		}
	}

	return false;
}
