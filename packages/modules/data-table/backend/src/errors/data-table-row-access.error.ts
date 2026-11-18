import { UserError } from 'n8n-workflow';

export class DataTableRowAccessError extends UserError {
	constructor(msg: string) {
		super(msg, { level: 'warning' });
	}
}
