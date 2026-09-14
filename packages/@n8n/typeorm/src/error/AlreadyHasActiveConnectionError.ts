import { TypeORMError } from './TypeORMError';

/**
 * Thrown when consumer tries to recreate connection with the same name, but previous connection was not closed yet.
 */
export class AlreadyHasActiveConnectionError extends TypeORMError {
	constructor(connectionName: string) {
		super(
			`Cannot create a new connection named "${connectionName}", because connection with such name ` +
				`already exist and it now has an active connection session.`,
		);
	}
}
