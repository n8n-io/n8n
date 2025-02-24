import { UnexpectedError } from 'n8n-workflow';

export class MissingExecutionStopError extends UnexpectedError {
	constructor(executionId: string) {
		super('Failed to find execution to stop', { extra: { executionId } });
	}
}
