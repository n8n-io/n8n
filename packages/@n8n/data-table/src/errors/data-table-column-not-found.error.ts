import { NotFoundError } from './response.error';

export class DataTableColumnNotFoundError extends NotFoundError {
	constructor(dataTableId: string, columnId: string) {
		super(`Could not find the column '${columnId}' in the data table: ${dataTableId}`);
	}
}
