import { UserError } from 'n8n-workflow';

export class DataStoreColumnNotFoundError extends UserError {
	constructor(dataStoreId: string, columnId: string) {
		super(`Could not find the column '${columnId}' in the data store: ${dataStoreId}`, {
			level: 'warning',
		});
	}
}
