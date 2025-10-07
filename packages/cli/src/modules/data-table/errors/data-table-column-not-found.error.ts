import { UserError } from 'n8n-workflow';

export class DataTableColumnNotFoundError extends UserError {
	constructor(dataTableId: string, columnId: string) {
		super(`Could not find the column '${columnId}' in the data table: ${dataTableId}`, {
			level: 'warning',
		});
	}
}
