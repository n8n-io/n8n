import { TypeORMError } from './TypeORMError';

/** Thrown when acquiring a lock times out */
export class LockAcquireTimeoutError extends TypeORMError {
	constructor(lockName: string, options: ErrorOptions = {}) {
		super(`Timeout waiting for lock ${lockName} to become available`, options);
	}
}
