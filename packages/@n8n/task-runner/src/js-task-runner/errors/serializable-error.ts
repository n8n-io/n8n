/**
 * Makes the given error's `message` and `stack` properties enumerable
 * so they can be serialized with JSON.stringify
 */
export function makeSerializable(error: Error) {
	Object.defineProperties(error, {
		message: {
			value: error.message,
			enumerable: true,
			configurable: true,
		},
		stack: {
			value: error.stack,
			enumerable: true,
			configurable: true,
		},
	});

	return error;
}

/**
 * Error that has its message property serialized as well. Used to transport
 * errors over the wire.
 */
export abstract class SerializableError extends Error {
	constructor(message: string) {
		super(message);

		makeSerializable(this);
	}
}
