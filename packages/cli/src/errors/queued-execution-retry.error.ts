import { ApplicationError } from 'n8n-workflow';

export class QueuedExecutionRetryError extends ApplicationError {
	constructor() {
		super('Execution is queued to run (not yet started) so it cannot be retried', {
			level: 'warning',
		});
	}
}
