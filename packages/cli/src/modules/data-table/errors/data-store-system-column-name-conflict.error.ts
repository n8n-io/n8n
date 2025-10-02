import { UserError } from 'n8n-workflow';

export class DataStoreSystemColumnNameConflictError extends UserError {
	constructor(columnName: string) {
		super(`Column name "${columnName}" is reserved as a system column name.`, {
			level: 'warning',
		});
	}
}
