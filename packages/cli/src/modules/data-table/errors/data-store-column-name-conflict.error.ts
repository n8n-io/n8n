import { UserError } from 'n8n-workflow';

export class DataStoreColumnNameConflictError extends UserError {
	constructor(columnName: string, dataStoreName: string) {
		super(
			`Data store column with name '${columnName}' already exists in data store '${dataStoreName}'`,
			{
				level: 'warning',
			},
		);
	}
}
