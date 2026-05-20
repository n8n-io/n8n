import { UserError } from 'n8n-workflow';

export class DashboardValidationError extends UserError {
	constructor(message: string) {
		super(message);
	}
}
