import { TypeORMError } from './TypeORMError';

/**
 * Thrown when user tries to build SELECT query using OFFSET without LIMIT applied but database does not support it.
 */
export class OffsetWithoutLimitNotSupportedError extends TypeORMError {
	constructor() {
		super(
			`RDBMS does not support OFFSET without LIMIT in SELECT statements. You must use limit in ` +
				`conjunction with offset function (or take in conjunction with skip function if you are ` +
				`using pagination).`,
		);
	}
}
