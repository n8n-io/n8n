import { TypeORMError } from './TypeORMError';

/**
 * Thrown . Theoretically can't be thrown.
 */
export class PersistedEntityNotFoundError extends TypeORMError {
	constructor() {
		super(
			`Internal error. Persisted entity was not found in the list of prepared operated entities.`,
		);
	}
}
