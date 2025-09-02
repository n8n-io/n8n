import { UserError } from 'n8n-workflow';

export class DataStoreNotFoundError extends UserError {
	constructor(dataStoreId: string) {
		super(`Could not find the Data table: '${dataStoreId}'`, {
			level: 'warning',
		});
	}
}
