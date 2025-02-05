import { ApplicationError } from 'n8n-workflow';

export class TaskRejectError extends ApplicationError {
	constructor(public reason: string) {
		super(`Task rejected with reason: ${reason}`, { level: 'info' });
	}
}
