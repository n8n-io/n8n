export class TypeORMError extends Error {
	get name() {
		return this.constructor.name;
	}

	constructor(message?: string, options: ErrorOptions = {}) {
		super(message, options);

		// restore prototype chain because the base `Error` type
		// will break the prototype chain a little
		if (Object.setPrototypeOf) {
			Object.setPrototypeOf(this, new.target.prototype);
		} else {
			(this as any).__proto__ = new.target.prototype;
		}
	}
}
