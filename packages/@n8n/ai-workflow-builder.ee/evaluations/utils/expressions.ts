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
