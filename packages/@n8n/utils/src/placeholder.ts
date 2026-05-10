const PLACEHOLDER_PREFIX = '<__PLACEHOLDER';
const PLACEHOLDER_SUFFIX = '__>';
const PLACEHOLDER_VALUE_PREFIX = '<__PLACEHOLDER_VALUE__';

const PLACEHOLDER_REGEX = /<__PLACEHOLDER.*?__>/;

export interface PlaceholderDetail {
	path: string[];
	label: string;
}

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

/** Checks if a value is a placeholder value (matches the placeholder regex pattern). */
export function isPlaceholderValue(value: unknown): boolean {
	if (typeof value !== 'string') return false;
	return !!value.match(PLACEHOLDER_REGEX);
}

/**
 * Extracts the label from a single placeholder string.
 * Handles formats like:
 * - <__PLACEHOLDER_VALUE__label__>
 * - <__PLACEHOLDER__: label__>
 */
function extractLabelFromPlaceholder(placeholder: string): string {
	let label = placeholder.slice(PLACEHOLDER_PREFIX.length, -PLACEHOLDER_SUFFIX.length);

	if (label.startsWith('_VALUE__')) {
		label = label.slice('_VALUE__'.length);
	} else if (label.startsWith('__:')) {
		label = label.slice('__:'.length);
	} else if (label.startsWith('__')) {
		label = label.slice('__'.length);
	}

	return label.trim();
}

/**
 * Extracts all placeholder labels from a string value.
 * Handles both cases where the entire value is a placeholder and where
 * placeholders are embedded within code (e.g., Code node).
 * Returns an array of labels found.
 */
export function extractPlaceholderLabels(value: unknown): string[] {
	if (typeof value !== 'string') return [];

	const labels: string[] = [];
	const regex = new RegExp(PLACEHOLDER_REGEX.source, 'g');
	let match;

	while ((match = regex.exec(value)) !== null) {
		const label = extractLabelFromPlaceholder(match[0]);
		if (label.length > 0) {
			labels.push(label);
		}
	}

	return labels;
}

/**
 * Recursively searches through a value (object, array, or primitive) to find
 * all placeholder values and their paths.
 */
export function findPlaceholderDetails(value: unknown, path: string[] = []): PlaceholderDetail[] {
	if (typeof value === 'string') {
		const labels = extractPlaceholderLabels(value);
		return labels.map((label) => ({ path, label }));
	}

	if (Array.isArray(value)) {
		return value.flatMap((item, index) => findPlaceholderDetails(item, [...path, `[${index}]`]));
	}

	if (value !== null && typeof value === 'object') {
		return Object.entries(value).flatMap(([key, nested]) =>
			findPlaceholderDetails(nested, [...path, key]),
		);
	}

	return [];
}

/**
 * Formats a path array into a dot-notation string for display.
 * Array indices are preserved as [N] without leading dots.
 */
export function formatPlaceholderPath(path: string[]): string {
	if (path.length === 0) return 'parameters';

	return path
		.map((segment, index) => (segment.startsWith('[') || index === 0 ? segment : `.${segment}`))
		.join('');
}
