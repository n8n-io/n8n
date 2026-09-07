import { TypeORMError } from './TypeORMError';

export class DatabaseConnectionLeaseAlreadyReleasedError extends TypeORMError {
	constructor() {
		super(`Database connection lease already released. Cannot run queries anymore.`);
	}
}
