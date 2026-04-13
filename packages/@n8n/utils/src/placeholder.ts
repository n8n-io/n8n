const PLACEHOLDER_PREFIX = '<__PLACEHOLDER_VALUE__';
const PLACEHOLDER_SUFFIX = '__>';

/** Check if a value is a placeholder sentinel string (format: `<__PLACEHOLDER_VALUE__hint__>`). */
export function isPlaceholderString(value: unknown): boolean {
	return (
		typeof value === 'string' &&
		value.startsWith(PLACEHOLDER_PREFIX) &&
		value.endsWith(PLACEHOLDER_SUFFIX)
	);
}

/** Recursively check if a value (string, array, or object) contains any placeholder sentinel strings. */
export function hasPlaceholderDeep(value: unknown): boolean {
	if (typeof value === 'string') return isPlaceholderString(value);
	if (Array.isArray(value)) return value.some(hasPlaceholderDeep);
	if (value !== null && typeof value === 'object') {
		return Object.values(value as Record<string, unknown>).some(hasPlaceholderDeep);
	}
	return false;
}
