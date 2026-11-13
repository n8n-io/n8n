import { UserError } from '@n8n/errors';

export class DataTableNameConflictError extends UserError {
	constructor(name: string) {
		super(`Data table with name '${name}' already exists in this project`, {
			level: 'warning',
		});
	}
}
