/**
 * Error that has its message property serialized as well. Used to transport
 * errors over the wire.
 */
export abstract class SerializableError extends Error {
	constructor(message: string) {
		super(message);

		// So it is serialized as well
		this.makeMessageEnumerable();
	}

	private makeMessageEnumerable() {
		Object.defineProperty(this, 'message', {
			value: this.message,
			enumerable: true, // This makes the message property enumerable
			writable: true,
			configurable: true,
		});
	}
}
