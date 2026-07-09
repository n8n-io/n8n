import { UserError } from 'n8n-workflow';

export class TaskRejectError extends UserError {
	constructor(public reason: string) {
		super(`Task rejected with reason: ${reason}`);
	}
}
