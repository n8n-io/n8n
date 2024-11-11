import { ApplicationError } from 'n8n-workflow';

export class UnsupportedSourceError extends ApplicationError {
	constructor(dbType: string) {
		super(`Exporting from ${dbType} is not supported. Please import from a Sqlite database.`, {
			level: 'warning',
		});
	}
}
