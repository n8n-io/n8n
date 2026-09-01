import { TypeORMError } from './TypeORMError';

/**
 * Thrown when user tries to insert using QueryBuilder but do not specify what to insert.
 */
export class InsertValuesMissingError extends TypeORMError {
	constructor() {
		super(
			`Cannot perform insert query because values are not defined. ` +
				`Call "qb.values(...)" method to specify inserted values.`,
		);
	}
}
