import { NotFoundError } from '@/errors/response-errors/not-found.error';

export class DataTableNotFoundError extends NotFoundError {
	constructor(dataTableId: string) {
		super(`Could not find the data table: '${dataTableId}'`);
	}
}
