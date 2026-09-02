import { UserError } from 'n8n-workflow';

export class ProjectExecutionQuotaExceededError extends UserError {
	constructor(limit: number, periodUnit: string) {
		super(`This project has reached its execution quota of ${limit} per ${periodUnit}.`);
	}
}
