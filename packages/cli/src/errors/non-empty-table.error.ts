import { ApplicationError } from 'n8n-workflow';

export class NonEmptyTableError extends ApplicationError {
	constructor(tableName: string) {
		super(`Found non-empty table "${tableName}" but expected it to be empty.`, {
			level: 'warning',
		});
	}
}
