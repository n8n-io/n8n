import { ApplicationError } from 'n8n-workflow';

export class LastMigrationNotFoundError extends ApplicationError {
	constructor() {
		super('Failed to find last executed migration. Please run migrations first.', {
			level: 'warning',
		});
	}
}
