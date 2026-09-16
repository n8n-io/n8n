import { NotFoundError } from '@n8n/backend-services';

export class DataTableColumnNotFoundError extends NotFoundError {
	constructor(dataTableId: string, columnId: string) {
		super(`Could not find the column '${columnId}' in the data table: ${dataTableId}`);
	}
}
