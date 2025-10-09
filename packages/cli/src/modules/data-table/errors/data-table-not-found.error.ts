import { UserError } from 'n8n-workflow';

export class DataTableNotFoundError extends UserError {
	constructor(dataTableId: string) {
		super(`Could not find the data table: '${dataTableId}'`, {
			level: 'warning',
		});
	}
}
