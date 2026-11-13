import { OperationalError } from '@n8n/errors';

export class TaskCancelledError extends OperationalError {
	constructor(reason: string) {
		super(`Task cancelled: ${reason}`, { level: 'warning' });
	}
}
