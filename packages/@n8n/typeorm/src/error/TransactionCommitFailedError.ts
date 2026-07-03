import { TypeORMError } from './TypeORMError';

/** Thrown when transaction commit fails */
export class TransactionCommitFailedError extends TypeORMError {
	constructor(cause: unknown) {
		super('Transaction commit failed', { cause });
	}
}
