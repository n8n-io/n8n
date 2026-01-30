/**
 * Serialized error format that can be transmitted over JSON
 */
export interface SerializedError {
	name: string;
	message: string;
	stack?: string;
	// Preserve common n8n error properties
	description?: string;
	node?: { name: string };
	[key: string]: unknown;
}

/**
 * Serializes an error for transmission over JSON.
 *
 * JavaScript Error objects have non-enumerable properties (message, stack, name),
 * which means JSON.stringify() converts them to empty objects `{}`.
 * This function extracts all relevant properties into a plain object.
 */
export function serializeError(error: unknown): SerializedError {
	if (error instanceof Error) {
		const serialized: SerializedError = {
			name: error.name,
			message: error.message,
			stack: error.stack,
		};
		// Copy any additional enumerable properties (e.g., from NodeOperationError, ApplicationError)
		for (const key of Object.keys(error)) {
			serialized[key] = (error as unknown as Record<string, unknown>)[key];
		}
		return serialized;
	}

	// If it's already a plain object with message, return it as-is
	if (typeof error === 'object' && error !== null && 'message' in error) {
		return error as SerializedError;
	}

	// Fallback for unknown error types (strings, numbers, etc.)
	return {
		name: 'Error',
		message: String(error),
	};
}
