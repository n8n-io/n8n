import { UserError } from 'n8n-workflow';

export class DataStoreSystemColumnNameConflictError extends UserError {
	constructor(columnName: string, type: string = 'system') {
		super(`Column name "${columnName}" is reserved as a ${type} column name.`, {
			level: 'warning',
		});
	}
}
