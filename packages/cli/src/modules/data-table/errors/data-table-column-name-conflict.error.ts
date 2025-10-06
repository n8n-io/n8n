import { UserError } from 'n8n-workflow';

export class DataTableColumnNameConflictError extends UserError {
	constructor(columnName: string, dataStoreName: string) {
		super(
			`Data table column with name '${columnName}' already exists in data table '${dataStoreName}'`,
			{
				level: 'warning',
			},
		);
	}
}
