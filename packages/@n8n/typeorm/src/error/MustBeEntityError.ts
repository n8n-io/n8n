import { TypeORMError } from './TypeORMError';

/**
 * Thrown when method expects entity but instead something else is given.
 */
export class MustBeEntityError extends TypeORMError {
	constructor(operation: string, wrongValue: any) {
		super(`Cannot ${operation}, given value must be an entity, instead "${wrongValue}" is given.`);
	}
}
