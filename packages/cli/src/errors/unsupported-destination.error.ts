import { ApplicationError } from 'n8n-workflow';

export class UnsupportedDestinationError extends ApplicationError {
	constructor(dbType: string) {
		super(`Importing into ${dbType} is not supported. Please import into a Postgres database.`, {
			level: 'warning',
		});
	}
}
