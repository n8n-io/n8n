import { ApplicationError } from '@n8n/errors';

export class TaskCancelledError extends ApplicationError {
	constructor(reason: string) {
		super(`Task cancelled: ${reason}`, { level: 'warning' });
	}
}
