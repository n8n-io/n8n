import { UserError } from 'n8n-workflow';

export class DataTableColumnNameConflictError extends UserError {
	constructor(columnName: string, dataTableName: string) {
		super(
			`Data table column with name '${columnName}' already exists in data table '${dataTableName}'`,
			{
				level: 'warning',
			},
		);
	}
}
