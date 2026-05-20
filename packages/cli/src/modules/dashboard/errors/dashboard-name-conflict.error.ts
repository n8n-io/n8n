import { UserError } from 'n8n-workflow';

export class DashboardNameConflictError extends UserError {
	constructor(message: string) {
		super(message);
	}
}
