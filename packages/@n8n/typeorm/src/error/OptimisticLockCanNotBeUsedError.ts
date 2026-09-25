import { TypeORMError } from './TypeORMError';

/**
 * Thrown when an optimistic lock cannot be used in query builder.
 */
export class OptimisticLockCanNotBeUsedError extends TypeORMError {
	constructor() {
		super(`The optimistic lock can be used only with getOne() method.`);
	}
}
