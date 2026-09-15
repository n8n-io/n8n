import { UserError } from 'n8n-workflow';

export class AppQuotaExceededError extends UserError {
	constructor(limit: number, current: number) {
		super(
			`App limit exceeded: this project has ${current} apps, limit is ${limit}. Delete an app or contact your admin to raise the limit.`,
			{ level: 'warning' },
		);
	}
}
