/**
 * Validation helper functions for workflow builder
 * Pure functions extracted from WorkflowBuilderImpl
 */

import { isTriggerNodeType } from '../utils/trigger-detection';

/**
 * Check if a value contains an n8n expression
 */
export function containsExpression(value: unknown): boolean {
	if (typeof value !== 'string') {
		return false;
	}
	return value.includes('={{') || value.startsWith('=');
}

/**
 * Check if a value contains a malformed expression ({{ $ without = prefix)
 */
export function containsMalformedExpression(value: unknown): boolean {
	if (typeof value !== 'string') {
		return false;
	}
	return !value.startsWith('=') && value.includes('{{ $');
}

/**
 * Check if a header name is sensitive (typically contains credentials)
 */
export function isSensitiveHeader(name: string): boolean {
	const sensitiveHeaders = new Set([
		'authorization',
		'x-api-key',
		'x-auth-token',
		'x-access-token',
		'api-key',
		'apikey',
	]);
	return sensitiveHeaders.has(name.toLowerCase());
}

/**
 * Check if a field name looks like it's meant to store credentials
 */
export function isCredentialFieldName(name: string): boolean {
	const patterns = [
		/api[_-]?key/i,
		/access[_-]?token/i,
		/auth[_-]?token/i,
		/bearer[_-]?token/i,
		/secret[_-]?key/i,
		/private[_-]?key/i,
		/client[_-]?secret/i,
		/password/i,
		/credentials?/i,
		/^token$/i,
		/^secret$/i,
		/^auth$/i,
	];
	return patterns.some((pattern) => pattern.test(name));
}

/**
 * Check if a node type is a tool node
 */
export function isToolNode(type: string): boolean {
	return type.includes('tool') || type.includes('Tool');
}

/**
 * Tools that don't require parameters
 */
export const TOOLS_WITHOUT_PARAMETERS = new Set([
	'@n8n/n8n-nodes-langchain.toolCalculator',
	'@n8n/n8n-nodes-langchain.toolVectorStore',
	'@n8n/n8n-nodes-langchain.vectorStoreInMemory',
	'@n8n/n8n-nodes-langchain.mcpClientTool',
	'@n8n/n8n-nodes-langchain.toolWikipedia',
	'@n8n/n8n-nodes-langchain.toolSerpApi',
]);

/**
 * Check if a value or nested object contains $fromAI expression
 */
export function containsFromAI(value: unknown): boolean {
	if (typeof value === 'string') {
		return value.includes('$fromAI');
	}
	if (Array.isArray(value)) {
		return value.some((item) => containsFromAI(item));
	}
	if (typeof value === 'object' && value !== null) {
		return Object.values(value).some((v) => containsFromAI(v));
	}
	return false;
}

/**
 * Check if a node type is a trigger
 */
export function isTriggerNode(type: string): boolean {
	return isTriggerNodeType(type);
}

/**
 * Recursively find all string values that have {{ $... }} without = prefix
 */
export function findMissingExpressionPrefixes(
	value: unknown,
	path: string = '',
): Array<{ path: string; value: string }> {
	const issues: Array<{ path: string; value: string }> = [];

	if (typeof value === 'string') {
		// If string starts with '=', it's already an expression - {{ }} is valid template syntax inside
		// Otherwise check if it contains {{ $ pattern (n8n variable reference without = prefix)
		if (!value.startsWith('=') && value.includes('{{ $')) {
			issues.push({ path, value });
		}
	} else if (Array.isArray(value)) {
		value.forEach((item, index) => {
			issues.push(...findMissingExpressionPrefixes(item, `${path}[${index}]`));
		});
	} else if (value && typeof value === 'object') {
		// Skip PlaceholderValue objects - their hint property is documentation, not actual expressions
		if ('__placeholder' in value && (value as { __placeholder: boolean }).__placeholder) {
			return issues;
		}
		for (const [key, val] of Object.entries(value)) {
			const newPath = path ? `${path}.${key}` : key;
			issues.push(...findMissingExpressionPrefixes(val, newPath));
		}
	}

	return issues;
}

/**
 * Check if a string contains .toISOString() misused with Luxon DateTime objects.
 * Detects patterns like $now.toISOString(), $today.toISOString(), etc.
 * Does NOT flag valid JS Date usage like new Date().toISOString().
 */
export function hasLuxonToISOStringMisuse(value: string): boolean {
	if (!value.includes('.toISOString()')) {
		return false;
	}

	// Patterns that indicate Luxon DateTime misuse:
	// - $now.toISOString() or $now.something().toISOString()
	// - $today.toISOString() or $today.something().toISOString()
	// - DateTime.now().toISOString() or DateTime.local().toISOString()
	const luxonPatterns = [
		/\$now\b[^;]*\.toISOString\(\)/,
		/\$today\b[^;]*\.toISOString\(\)/,
		/DateTime\s*\.\s*(now|local|utc|fromISO|fromJSDate)\s*\([^)]*\)[^;]*\.toISOString\(\)/,
	];

	return luxonPatterns.some((pattern) => pattern.test(value));
}

/**
 * Recursively find string values containing .toISOString() used with Luxon DateTime objects.
 * Only flags when used with $now, $today, or Luxon-like method chains, not with new Date().
 */
export function findInvalidDateMethods(
	value: unknown,
	path: string = '',
): Array<{ path: string; value: string }> {
	const issues: Array<{ path: string; value: string }> = [];

	if (typeof value === 'string') {
		if (hasLuxonToISOStringMisuse(value)) {
			issues.push({ path, value });
		}
	} else if (Array.isArray(value)) {
		value.forEach((item, index) => {
			issues.push(...findInvalidDateMethods(item, `${path}[${index}]`));
		});
	} else if (value && typeof value === 'object') {
		// Skip PlaceholderValue objects
		if ('__placeholder' in value && (value as { __placeholder: boolean }).__placeholder) {
			return issues;
		}
		for (const [key, val] of Object.entries(value)) {
			const newPath = path ? `${path}.${key}` : key;
			issues.push(...findInvalidDateMethods(val, newPath));
		}
	}

	return issues;
}

/**
 * Extract all expressions from node parameters (recursive)
 */
export function extractExpressions(params: unknown): Array<{ expression: string; path: string }> {
	const results: Array<{ expression: string; path: string }> = [];

	const recurse = (value: unknown, path: string) => {
		if (typeof value === 'string') {
			// Check if it's an expression (starts with =)
			if (value.startsWith('=')) {
				results.push({ expression: value, path });
			}
		} else if (Array.isArray(value)) {
			value.forEach((item, index) => {
				recurse(item, `${path}[${index}]`);
			});
		} else if (value && typeof value === 'object') {
			for (const [key, val] of Object.entries(value)) {
				const newPath = path ? `${path}.${key}` : key;
				recurse(val, newPath);
			}
		}
	};

	recurse(params, '');
	return results;
}

/**
 * Parse expression into structured form
 */
export function parseExpression(expr: string): {
	type: '$json' | '$node' | '$input' | 'other';
	nodeName?: string;
	fieldPath: string[];
} {
	// Pattern for $json.field.path
	const jsonMatch = expr.match(/\$json\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/);
	if (jsonMatch) {
		return {
			type: '$json',
			fieldPath: jsonMatch[1].split('.'),
		};
	}

	// Pattern for $('NodeName').item.json.field.path
	const nodeMatch = expr.match(
		/\$\(['"]([^'"]+)['"]\)\.item\.json\.([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/,
	);
	if (nodeMatch) {
		return {
			type: '$node',
			nodeName: nodeMatch[1],
			fieldPath: nodeMatch[2].split('.'),
		};
	}

	return { type: 'other', fieldPath: [] };
}

/**
 * Check if path exists in object shape
 */
export function hasPath(shape: Record<string, unknown>, path: string[]): boolean {
	let current: unknown = shape;
	for (const key of path) {
		if (current === null || current === undefined || typeof current !== 'object') {
			return false;
		}
		if (!(key in current)) {
			return false;
		}
		current = (current as Record<string, unknown>)[key];
	}
	return true;
}
