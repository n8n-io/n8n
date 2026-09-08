import { UserError } from 'n8n-workflow';

export class DataTableKanbanConflictError extends UserError {
	constructor() {
		super('The Kanban board changed. Refresh the affected columns and try again.', {
			level: 'warning',
		});
	}
}
