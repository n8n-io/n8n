import { UserError } from 'n8n-workflow';

export class AppVersionQuotaExceededError extends UserError {
	constructor(limit: number, current: number) {
		super(
			`Version limit exceeded: this app has ${current} versions, limit is ${limit}. Delete an old version to publish a new one.`,
			{ level: 'warning' },
		);
	}
}
