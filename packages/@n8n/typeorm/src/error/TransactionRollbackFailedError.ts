import { TypeORMError } from './TypeORMError';

/** Thrown when transaction rollback fails */
export class TransactionRollbackFailedError extends TypeORMError {
	constructor(cause: unknown) {
		super('Transaction rollback failed', { cause });
	}
}
