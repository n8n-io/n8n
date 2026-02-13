/**
 * String utility functions for workflow builder
 */

import { createHash } from 'crypto';

/**
 * Common JavaScript methods that may appear after field paths in expressions.
 * These should not be treated as part of the field path during validation.
 * E.g., $json.output.includes("test") - "includes" is a method, not a field.
 */
export const JS_METHODS = new Set([
	'includes',
	'indexOf',
	'slice',
	'substring',
	'toLowerCase',
	'toUpperCase',
	'trim',
	'split',
	'replace',
	'match',
	'startsWith',
	'endsWith',
	'filter',
	'map',
	'reduce',
	'find',
	'findIndex',
	'some',
	'every',
	'forEach',
	'join',
	'sort',
	'push',
	'pop',
	'length',
	'toString',
]);

/**
 * Remove trailing JS methods from field path.
 * E.g., ["output", "includes"] -> ["output"]
 */
export function filterMethodsFromPath(fieldPath: string[]): string[] {
	const result = [...fieldPath];
	while (result.length > 0 && JS_METHODS.has(result[result.length - 1])) {
		result.pop();
	}
	return result;
}

/**
 * Parse version string to number
 */
export function parseVersion(version: string | number | undefined): number {
	if (typeof version === 'number') return version;
	if (!version) return 1;
	const match = version.match(/v?(\d+(?:\.\d+)?)/);
	return match ? parseFloat(match[1]) : 1;
}

/**
 * Check if a value is a placeholder string
 */
export function isPlaceholderValue(value: unknown): boolean {
	if (typeof value !== 'string') return false;
	return value.startsWith('<__PLACEHOLDER_VALUE__') && value.endsWith('__>');
}

/**
 * Check if an object looks like a resource locator value.
 * Resource locators have a 'mode' property (typically 'list', 'id', 'url', or 'name')
 * and a 'value' property.
 */
export function isResourceLocatorLike(obj: unknown): obj is Record<string, unknown> {
	if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
		return false;
	}
	const record = obj as Record<string, unknown>;
	// Must have 'mode' property - this is the key identifier
	// Common modes: 'list', 'id', 'url', 'name'
	if (!('mode' in record)) {
		return false;
	}
	// Should have 'value' property as well (the actual selected value)
	if (!('value' in record)) {
		return false;
	}
	return true;
}

/**
 * Recursively normalize resource locator values in parameters.
 * Adds __rl: true to objects that look like resource locator values but are missing it.
 */
export function normalizeResourceLocators(params: unknown): unknown {
	if (typeof params !== 'object' || params === null) {
		return params;
	}

	if (Array.isArray(params)) {
		return params.map((item) => normalizeResourceLocators(item));
	}

	const result: Record<string, unknown> = {};
	const record = params as Record<string, unknown>;

	for (const [key, value] of Object.entries(record)) {
		if (isResourceLocatorLike(value)) {
			const rlValue = value;
			const normalizedInner = normalizeResourceLocators(rlValue) as Record<string, unknown>;

			// Clear placeholder value when mode is 'list' - list mode requires user selection
			if (rlValue.mode === 'list' && isPlaceholderValue(rlValue.value)) {
				result[key] = {
					__rl: true,
					...normalizedInner,
					value: '',
				};
			} else {
				// Add __rl: true if missing
				result[key] = {
					__rl: true,
					...normalizedInner,
				};
			}
		} else if (typeof value === 'object' && value !== null) {
			// Recursively process nested objects
			result[key] = normalizeResourceLocators(value);
		} else {
			result[key] = value;
		}
	}

	return result;
}

/**
 * Check if a '/' at position i could be the start of a regex literal.
 * Uses heuristic based on preceding non-whitespace character.
 */
function couldBeRegexStart(code: string, i: number): boolean {
	// Find the previous non-whitespace character
	let j = i - 1;
	while (j >= 0 && /\s/.test(code[j])) {
		j--;
	}
	if (j < 0) return true; // Start of string, likely regex

	const prevChar = code[j];
	// Characters that can precede a regex literal
	// (not an identifier char or closing bracket/paren that would make it division)
	const regexPreceders = '(,=:[!&|?;{}><%+-*/^~';
	return regexPreceders.includes(prevChar);
}

/**
 * Escape raw newlines inside double/single quoted strings within JavaScript code.
 * Skip backtick template literals (they allow raw newlines).
 * Skip regex literals (to avoid misinterpreting quotes inside them).
 * Don't double-escape already escaped \n.
 */
export function escapeNewlinesInStringLiterals(code: string): string {
	let result = '';
	let i = 0;

	while (i < code.length) {
		const char = code[i];

		// Check for template literal (backtick) - skip entirely
		if (char === '`') {
			const start = i;
			i++; // skip opening backtick
			while (i < code.length) {
				if (code[i] === '\\' && i + 1 < code.length) {
					i += 2; // skip escaped character
				} else if (code[i] === '`') {
					i++; // skip closing backtick
					break;
				} else {
					i++;
				}
			}
			// Append entire template literal unchanged
			result += code.slice(start, i);
			continue;
		}

		// Check for regex literal - skip entirely to avoid misinterpreting quotes inside
		if (char === '/' && couldBeRegexStart(code, i)) {
			// Make sure it's not a comment (// or /*)
			const next = code[i + 1];
			if (next !== '/' && next !== '*') {
				const start = i;
				i++; // skip opening /
				while (i < code.length) {
					if (code[i] === '\\' && i + 1 < code.length) {
						i += 2; // skip escaped character
					} else if (code[i] === '/') {
						i++; // skip closing /
						// Skip regex flags (g, i, m, s, u, y)
						while (i < code.length && /[gimsuy]/.test(code[i])) {
							i++;
						}
						break;
					} else if (code[i] === '\n') {
						// Newline before closing / means it's not a regex (or malformed)
						// Just break and let normal processing continue
						break;
					} else {
						i++;
					}
				}
				// Append entire regex unchanged
				result += code.slice(start, i);
				continue;
			}
		}

		// Check for double or single quote - process string literal
		if (char === '"' || char === "'") {
			const quote = char;
			result += char;
			i++; // skip opening quote

			while (i < code.length) {
				const c = code[i];

				if (c === '\\' && i + 1 < code.length) {
					// Escaped character - pass through as-is
					result += c + code[i + 1];
					i += 2;
				} else if (c === quote) {
					// End of string
					result += c;
					i++;
					break;
				} else if (c === '\n') {
					// Raw newline - escape it
					result += '\\n';
					i++;
				} else {
					result += c;
					i++;
				}
			}
			continue;
		}

		// Any other character - pass through
		result += char;
		i++;
	}

	return result;
}

/**
 * Escape raw newlines inside string literals within {{ }} expression blocks.
 *
 * Only processes strings starting with `=` (n8n expressions).
 * Only escapes inside double/single quoted strings within {{ }}.
 * Does NOT escape inside backtick template literals (they allow newlines).
 * Does NOT double-escape already escaped \\n.
 */
export function escapeNewlinesInExpressionStrings(value: unknown): unknown {
	if (typeof value === 'string') {
		// Only process n8n expressions (start with =)
		if (!value.startsWith('=')) {
			return value;
		}

		// Find {{ }} blocks and process string literals within them
		return value.replace(/\{\{([\s\S]*?)\}\}/g, (_match, inner: string) => {
			const escaped = escapeNewlinesInStringLiterals(inner);
			return `{{${escaped}}}`;
		});
	}

	if (Array.isArray(value)) {
		return value.map(escapeNewlinesInExpressionStrings);
	}

	if (typeof value === 'object' && value !== null) {
		const result: Record<string, unknown> = {};
		for (const [key, val] of Object.entries(value)) {
			result[key] = escapeNewlinesInExpressionStrings(val);
		}
		return result;
	}

	return value;
}

/**
 * Generate a deterministic UUID based on workflow ID, node type, and node name.
 * This ensures that the same workflow structure always produces the same node IDs,
 * which is critical for the AI workflow builder where code may be re-parsed multiple times.
 */
export function generateDeterministicNodeId(
	workflowId: string,
	nodeType: string,
	nodeName: string,
): string {
	const hash = createHash('sha256')
		.update(`${workflowId}:${nodeType}:${nodeName}`)
		.digest('hex')
		.slice(0, 32);

	// Format as valid UUID v4 structure
	return [
		hash.slice(0, 8),
		hash.slice(8, 12),
		'4' + hash.slice(13, 16), // Version 4
		((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20), // Variant
		hash.slice(20, 32),
	].join('-');
}
