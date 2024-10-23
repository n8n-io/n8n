import { ApplicationError } from 'n8n-workflow';

export class MigrationsMismatchError extends ApplicationError {
	constructor(lastSourceMigration: string, lastDestinationMigration: string) {
		super(
			`The last migration executed in the source database "${lastSourceMigration}" differs from the last migration executed in the destination database "${lastDestinationMigration}". Run the same migrations on both databases before importing.`,
			{ level: 'warning' },
		);
	}
}
