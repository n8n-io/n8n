import { UserError } from 'n8n-workflow';

export class DataStoreColumnNameConflictError extends UserError {
	constructor(columnName: string, dataStoreId: string) {
		super(
			`Data store column with name '${columnName}' already exists in data store '${dataStoreId}'`,
			{
				level: 'warning',
			},
		);
	}
}
