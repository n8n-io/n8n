import { TypeORMError } from './TypeORMError';

/**
 * Thrown when transaction is not started yet and user tries to run commit or rollback.
 */
export class TransactionNotStartedError extends TypeORMError {
	constructor() {
		super(
			`Transaction is not started yet, start transaction before committing or rolling it back.`,
		);
	}
}
