import { NotFoundError } from '@/errors/response-errors/not-found';

export class DataTableColumnNotFoundError extends NotFoundError {
	constructor(dataTableId: string, columnId: string) {
		super(`Could not find the column '${columnId}' in the data table: ${dataTableId}`);
	}
}
