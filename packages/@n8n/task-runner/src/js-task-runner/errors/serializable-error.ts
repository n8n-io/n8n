/**
 * Safely converts an error into a plain object containing only primitive properties.
 * This prevents OOM crashes and circular reference errors when serializing massive
 * database exceptions (like those from pg) over IPC.
 */
export function makeSerializable(error: Error) {
	const safeError = Object.create(Object.getPrototypeOf(error)) as Error & Record<string, unknown>;

	// Always ensure standard Error properties are present and explicitly enumerable for JSON.stringify
	Object.defineProperties(safeError, {
		name: {
			value: error.name,
			enumerable: true,
			configurable: true,
			writable: true,
		},
		message: {
			value: error.message,
			enumerable: true,
			configurable: true,
			writable: true,
		},
		stack: {
			value: error.stack,
			enumerable: true,
			configurable: true,
			writable: true,
		},
	});

	// Safely copy over any top-level primitive values (e.g. error.code, error.detail)
	for (const key of Object.getOwnPropertyNames(error)) {
		if (key === 'name' || key === 'message' || key === 'stack') continue;

		try {
			const value = (error as unknown as Record<string, unknown>)[key];
			if (['string', 'number', 'boolean'].includes(typeof value)) {
				safeError[key] = value;
			} else if (value === null || value === undefined) {
				safeError[key] = value;
			}
		} catch (e) {
			// Ignore properties that throw on access
		}
	}

	return safeError;
}

/**
 * Error that makes its message and stack properties enumerable so they are
 * serialized when transported over the wire.
 */
export abstract class SerializableError extends Error {
	constructor(message: string) {
		super(message);

		Object.defineProperties(this, {
			message: {
				value: this.message,
				enumerable: true,
				configurable: true,
				writable: true,
			},
			stack: {
				value: this.stack,
				enumerable: true,
				configurable: true,
				writable: true,
			},
		});
	}
}
