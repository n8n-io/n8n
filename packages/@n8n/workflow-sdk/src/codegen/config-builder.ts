/**
 * Config Builder
 *
 * Helper for building configuration strings with conditional entries.
 * Used for generating node config, merge config, sticky config, etc.
 */

/**
 * A single config entry with a condition for inclusion
 */
export interface ConfigEntry {
	/** Whether to include this entry */
	condition: boolean;
	/** The key name */
	key: string;
	/** The formatted value (already stringified) */
	value: string;
}

/**
 * Build a config string from conditional entries.
 * Only includes entries where condition is true.
 *
 * @param entries - Array of config entries with conditions
 * @returns Formatted config string like "{ key1: value1, key2: value2 }"
 *
 * @example
 * const config = buildConfigString([
 *   { condition: true, key: 'name', value: '"test"' },
 *   { condition: hasParams, key: 'parameters', value: '{ foo: "bar" }' },
 *   { condition: false, key: 'skip', value: '"this"' },
 * ]);
 * // Returns: '{ name: "test", parameters: { foo: "bar" } }'
 */
export function buildConfigString(entries: ConfigEntry[]): string {
	const includedEntries = entries.filter((e) => e.condition);

	if (includedEntries.length === 0) {
		return '{}';
	}

	const parts = includedEntries.map((e) => `${e.key}: ${e.value}`);
	return `{ ${parts.join(', ')} }`;
}

/**
 * Build a config string with multiline formatting.
 * Useful for larger config objects.
 *
 * @param entries - Array of config entries with conditions
 * @param indent - Base indentation level
 * @returns Formatted multiline config string
 */
export function buildConfigStringMultiline(entries: ConfigEntry[], indent: string = ''): string {
	const includedEntries = entries.filter((e) => e.condition);

	if (includedEntries.length === 0) {
		return '{}';
	}

	const innerIndent = indent + '  ';
	const parts = includedEntries.map((e) => `${innerIndent}${e.key}: ${e.value}`);

	return `{\n${parts.join(',\n')}\n${indent}}`;
}
