/**
 * Validation helper functions for workflow builder
 * Pure functions extracted from WorkflowBuilderImpl
 */

import { isPlaceholderValue } from './string-utils';
import { isTriggerNodeType } from '../utils/trigger-detection';

/**
 * Assert that input is a plain (non-null, non-array) object.
 * Throws a descriptive TypeError when called with a string, number, null, or array.
 */
export function assertPlainObject(input: unknown, fnName: string, hint: string): void {
	if (typeof input !== 'object' || input === null || Array.isArray(input)) {
		const received = input === null ? 'null' : Array.isArray(input) ? 'an array' : typeof input;
		throw new TypeError(`${fnName}() requires ${hint}, but received ${received}.`);
	}
}

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
		// Skip placeholder markers — their embedded hint is documentation, not an expression.
		if (isPlaceholderValue(value)) return issues;
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
		if (isPlaceholderValue(value)) return issues;
		if (hasLuxonToISOStringMisuse(value)) {
			issues.push({ path, value });
		}
	} else if (Array.isArray(value)) {
		value.forEach((item, index) => {
			issues.push(...findInvalidDateMethods(item, `${path}[${index}]`));
		});
	} else if (value && typeof value === 'object') {
		for (const [key, val] of Object.entries(value)) {
			const newPath = path ? `${path}.${key}` : key;
			issues.push(...findInvalidDateMethods(val, newPath));
		}
	}

	return issues;
}
