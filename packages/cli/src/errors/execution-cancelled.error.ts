import { ApplicationError } from 'n8n-workflow';

export class ExecutionCancelledError extends ApplicationError {
	constructor(executionId: string) {
		super('The execution was cancelled', {
			level: 'warning',
			extra: { executionId },
		});
	}
}
