import { ApplicationError } from 'n8n-workflow';

export class AbortedExecutionRetryError extends ApplicationError {
	constructor() {
		super('The execution was aborted before starting, so it cannot be retried', {
			level: 'warning',
		});
	}
}
