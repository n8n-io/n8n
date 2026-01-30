import { MAX_EXECUTION_DATA_CHARS } from '../constants';

export interface TruncateJsonOptions {
	maxLength?: number;
	indent?: number;
}

/**
 * Safely stringify and truncate JSON to a max length.
 * Handles circular references and other serialization errors gracefully.
 *
 * @param value - The value to stringify and truncate
 * @param options - Configuration options
 * @returns The stringified (and possibly truncated) JSON
 */
export function truncateJson(value: unknown, options: TruncateJsonOptions = {}): string {
	const { maxLength = MAX_EXECUTION_DATA_CHARS, indent = 2 } = options;

	try {
		const result = JSON.stringify(value, null, indent);
		if (result.length <= maxLength) {
			return result;
		}
		return result.substring(0, maxLength) + '\n... (truncated)';
	} catch {
		return '[Unable to serialize data]';
	}
}
