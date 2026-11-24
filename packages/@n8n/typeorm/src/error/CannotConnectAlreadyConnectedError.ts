import { TypeORMError } from './TypeORMError';

/**
 * Thrown when consumer tries to connect when he already connected.
 */
export class CannotConnectAlreadyConnectedError extends TypeORMError {
	constructor(connectionName: string) {
		super(
			`Cannot create a "${connectionName}" connection because connection to the database already established.`,
		);
	}
}
