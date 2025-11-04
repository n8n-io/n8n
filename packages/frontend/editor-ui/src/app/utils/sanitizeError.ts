import { deepCopy, ExecutionBaseError } from 'n8n-workflow';

/**
 * Sanitizes an error object to remove circular references and non-serializable properties
 * that could break Vue reactivity or JSON serialization.
 *
 * This is necessary because error objects from the backend may contain:
 * - Circular references in node parameters
 * - Function references
 * - Complex nested objects that create circular dependencies
 *
 * @param error - The error object to sanitize
 * @returns A sanitized error object safe for Vue reactivity and JSON serialization
 */
export function sanitizeError(error: any): any {
	if (!error || typeof error !== 'object') {
		return error;
	}

	try {
		// Use JSON stringify/parse to break any circular references
		// The replacer function filters out problematic properties
		const stringified = JSON.stringify(error, (key, value) => {
			// Skip functions and undefined values - they can't be serialized
			if (typeof value === 'function' || value === undefined) {
				return undefined;
			}

			// For the node object, only keep essential properties
			// This avoids circular references in node.parameters or other complex nested structures
			if (key === 'node' && value && typeof value === 'object') {
				return {
					name: value.name,
					type: value.type,
					typeVersion: value.typeVersion,
					position: value.position,
					id: value.id,
				};
			}

			return value;
		});

		return JSON.parse(stringified);
	} catch (e) {
		// If JSON serialization fails (e.g., due to getters/setters with circular refs),
		// manually construct a safe object with only essential properties
		const sanitized: ExecutionBaseError = {
			name: error.name,
			message: error.message,
			description: error.description,
			timestamp: error.timestamp,
			level: error.level,
			functionality: error.functionality,
			stack: error.stack,
			context: {},
			lineNumber: error.lineNumber,
			tags: {},
		};

		// Safely copy context, with fallback for circular refs
		if (error.context && typeof error.context === 'object') {
			try {
				sanitized.context = deepCopy(error.context);
			} catch {
				// If context has circular refs, only keep primitive properties
				sanitized.context = {};
				for (const key in error.context) {
					const value = error.context[key];
					if (typeof value !== 'object' && typeof value !== 'function') {
						sanitized.context[key] = value;
					}
				}
			}
		}

		// Include only essential node properties
		if (error.node) {
			sanitized.node = {
				name: error.node.name,
				type: error.node.type,
				typeVersion: error.node.typeVersion,
				position: error.node.position,
				id: error.node.id,
			};
		}

		// Preserve other safe properties with fallbacks
		if (error.messages) {
			try {
				sanitized.messages = deepCopy(error.messages);
			} catch {
				sanitized.messages = [];
			}
		}

		if (error.tags) {
			try {
				sanitized.tags = deepCopy(error.tags);
			} catch {
				sanitized.tags = {};
			}
		}

		if (error.lineNumber !== undefined) {
			sanitized.lineNumber = error.lineNumber;
		}

		return sanitized;
	}
}
