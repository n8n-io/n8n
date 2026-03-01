/**
 * Provides syntax highlighting for embedded SQL queries in template strings.
 */
export function sql(strings: TemplateStringsArray, ...values: string[]): string {
	let result = '';

	// Interleave the strings with the values
	for (let i = 0; i < values.length; i++) {
		result += strings[i];
		result += values[i];
	}

	// Add the last string
	result += strings[strings.length - 1];

	return result;
}
