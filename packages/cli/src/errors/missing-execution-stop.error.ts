import { ApplicationError } from 'n8n-workflow';

export class MissingExecutionStopError extends ApplicationError {
	constructor(executionId: string) {
		super('Failed to find execution to stop', { extra: { executionId } });
	}
}
