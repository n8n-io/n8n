import { TypeORMError } from './TypeORMError';

/**
 * Thrown if the driver has already been released
 */
export class DriverAlreadyReleasedError extends TypeORMError {
	constructor() {
		super(`Driver has already been released.`);
	}
}
