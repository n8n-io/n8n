/**
 * Redacts a sensitive value for safe display.
 * Shows the first 4 and last 4 characters, masking the rest.
 * Short values (<=10 chars) show only first 2 + last 2.
 */
export function redactValue(value: string): string {
	if (value.length <= 6) return '******';

	if (value.length <= 10) {
		return `${value.slice(0, 2)}${'*'.repeat(value.length - 4)}${value.slice(-2)}`;
	}

	return `${value.slice(0, 4)}${'*'.repeat(Math.min(value.length - 8, 8))}${value.slice(-4)}`;
}
