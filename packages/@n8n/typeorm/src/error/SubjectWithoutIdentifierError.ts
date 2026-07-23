import { Subject } from '../persistence/Subject';
import { TypeORMError } from './TypeORMError';

/**
 * Thrown when operation is going to be executed on a subject without identifier.
 * This error should never be thrown, however it still presents to prevent user from updation or removing the whole table.
 * If this error occurs still, it most probably is an ORM internal problem which must be reported and fixed.
 */
export class SubjectWithoutIdentifierError extends TypeORMError {
	constructor(subject: Subject) {
		super(
			`Internal error. Subject ${subject.metadata.targetName} must have an identifier to perform operation.`,
		);
	}
}
