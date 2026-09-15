import { NotFoundError } from '@n8n/services-common';

export class DataTableNotFoundError extends NotFoundError {
	constructor(dataTableId: string) {
		super(`Could not find the data table: '${dataTableId}'`);
	}
}
