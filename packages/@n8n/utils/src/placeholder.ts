const PLACEHOLDER_PREFIX = '<__PLACEHOLDER';
const PLACEHOLDER_SUFFIX = '__>';
const PLACEHOLDER_VALUE_PREFIX = '<__PLACEHOLDER_VALUE__';

const PLACEHOLDER_REGEX = /<__PLACEHOLDER.*?__>/;

/** Check if a value is a placeholder sentinel string (format: `<__PLACEHOLDER_VALUE__hint__>`). */
export function isPlaceholderString(value: unknown): boolean {
	return (
		typeof value === 'string' &&
		value.startsWith(PLACEHOLDER_VALUE_PREFIX) &&
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

/**
 * Extract the human-readable hint label from the first placeholder sentinel found in a value.
 * Handles both direct string placeholders and nested objects/arrays (recurses to find the first match).
 * Returns `undefined` if no placeholder is found or the label is empty.
 */
export function extractPlaceholderLabel(value: unknown): string | undefined {
	if (typeof value === 'string') {
		const match = value.match(PLACEHOLDER_REGEX);
		if (!match) return undefined;

		let label = match[0].slice(PLACEHOLDER_PREFIX.length, -PLACEHOLDER_SUFFIX.length);

		if (label.startsWith('_VALUE__')) {
			label = label.slice('_VALUE__'.length);
		} else if (label.startsWith('__:')) {
			label = label.slice('__:'.length);
		} else if (label.startsWith('__')) {
			label = label.slice('__'.length);
		}

		label = label.trim();
		return label.length > 0 ? label : undefined;
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			const result = extractPlaceholderLabel(item);
			if (result) return result;
		}
		return undefined;
	}

	if (value !== null && typeof value === 'object') {
		for (const nested of Object.values(value as Record<string, unknown>)) {
			const result = extractPlaceholderLabel(nested);
			if (result) return result;
		}
		return undefined;
	}

	return undefined;
}
