import { UserError } from 'n8n-workflow';

export class DataTableAccessDeniedError extends UserError {
	constructor(action: 'create') {
		super(`You don't have the permissions to ${action} a data table in this project.`, {
			level: 'warning',
		});
	}
}
