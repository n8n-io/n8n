import { TypeORMError } from './TypeORMError';

/** Thrown when an invariant is violated */
export class InvariantViolatedError extends TypeORMError {
	constructor(message: string = 'Invariant violated', options: ErrorOptions = {}) {
		super(message, options);
	}
}
