import { UserError } from 'n8n-workflow';

export class DataTableColumnInUseError extends UserError {
	constructor(columnName: string) {
		super(`Column "${columnName}" is used by an active Data Table Trigger`);
	}
}
