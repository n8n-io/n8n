/**
 * String utility functions for code generation
 */

/**
 * Escape a string for use in generated code
 * Uses unicode escape sequences to preserve special characters through roundtrip
 */
export function escapeString(str: string): string {
	return str
		.replace(/\\/g, '\\\\')
		.replace(/'/g, "\\'")
		.replace(/\u2018/g, '\\u2018') // LEFT SINGLE QUOTATION MARK - preserve as unicode
		.replace(/\u2019/g, '\\u2019') // RIGHT SINGLE QUOTATION MARK - preserve as unicode
		.replace(/\u201C/g, '\\u201C') // LEFT DOUBLE QUOTATION MARK - preserve as unicode
		.replace(/\u201D/g, '\\u201D') // RIGHT DOUBLE QUOTATION MARK - preserve as unicode
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r');
}

/**
 * Escape a string for use inside a template literal. Newlines stay raw so the
 * generated source keeps the value's own line structure.
 */
export function escapeTemplateLiteral(str: string): string {
	return str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

/**
 * Format a string value as a code literal. Values with line breaks become template
 * literals so each line of a JSON body, prompt, or script lands on its own source
 * line — a scoped text edit can then target one line instead of a single escaped
 * line that holds the whole value. Everything else stays a single-quoted string.
 */
export function formatStringLiteral(str: string): string {
	if (str.includes('\n') || str.includes('\r')) {
		return `\`${escapeTemplateLiteral(str)}\``;
	}
	return `'${escapeString(str)}'`;
}

/**
 * Indent every line after the first, except lines that sit inside a template
 * literal — indenting those would change the string value.
 */
export function indentContinuationLines(text: string, indent: string): string {
	const lines = text.split('\n');
	if (lines.length === 1) return text;

	let inTemplate = false;
	return lines
		.map((line, index) => {
			const result = index === 0 || inTemplate ? line : `${indent}${line}`;
			for (let i = 0; i < line.length; i++) {
				if (line[i] === '\\') {
					i++;
				} else if (line[i] === '`') {
					inTemplate = !inTemplate;
				}
			}
			return result;
		})
		.join('\n');
}

/**
 * Check if a key needs to be quoted to be a valid JS identifier
 */
export function needsQuoting(key: string): boolean {
	// Valid JS identifier: starts with letter, _, or $, followed by letters, digits, _, or $
	return !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);
}

/**
 * Format an object key for code output
 */
export function formatKey(key: string): string {
	return needsQuoting(key) ? `'${escapeString(key)}'` : key;
}

/**
 * Escape special regex characters in a string
 */
export function escapeRegexChars(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if a value is a placeholder string
 * Format: <__PLACEHOLDER_VALUE__hint__>
 */
export function isPlaceholderValue(value: unknown): boolean {
	if (typeof value !== 'string') return false;
	return value.startsWith('<__PLACEHOLDER_VALUE__') && value.endsWith('__>');
}

/**
 * Extract the hint text from a placeholder value string
 */
export function extractPlaceholderHint(value: string): string {
	const match = value.match(/^<__PLACEHOLDER_VALUE__(.*)__>$/);
	return match ? match[1] : '';
}
