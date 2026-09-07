import { TypeORMError } from './TypeORMError';

/**
 * Thrown when selected sql driver does not supports locking.
 */
export class LockNotSupportedOnGivenDriverError extends TypeORMError {
	constructor() {
		super(`Locking not supported on given driver.`);
	}
}
