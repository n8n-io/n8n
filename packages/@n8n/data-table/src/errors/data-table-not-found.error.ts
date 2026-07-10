import { NotFoundError } from './response.error';

export class DataTableNotFoundError extends NotFoundError {
	constructor(dataTableId: string) {
		super(`Could not find the data table: '${dataTableId}'`);
	}
}
