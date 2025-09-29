import { UserError } from 'n8n-workflow';

export class DataStoreNameConflictError extends UserError {
	constructor(name: string) {
		super(`Data store with name '${name}' already exists in this project`, {
			level: 'warning',
		});
	}
}
