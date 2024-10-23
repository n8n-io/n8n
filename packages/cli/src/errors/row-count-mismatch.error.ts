import { ApplicationError } from 'n8n-workflow';

export class RowCountMismatchError extends ApplicationError {
	constructor(tableName: string, expectedRows: number, actualRows: number) {
		super(`Expected ${expectedRows} rows in table "${tableName}" but found ${actualRows}`, {
			level: 'warning',
		});
	}
}
