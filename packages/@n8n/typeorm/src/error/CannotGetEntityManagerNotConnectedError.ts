import { TypeORMError } from './TypeORMError';

/**
 * Thrown when consumer tries to access entity manager before connection is established.
 */
export class CannotGetEntityManagerNotConnectedError extends TypeORMError {
	constructor(connectionName: string) {
		super(
			`Cannot get entity manager for "${connectionName}" connection because connection is not yet established.`,
		);
	}
}
