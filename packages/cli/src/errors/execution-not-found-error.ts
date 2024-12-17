import { ApplicationError } from 'n8n-workflow';

export class ExecutionNotFoundError extends ApplicationError {
	constructor(executionId: string) {
		super('No active execution found', { extra: { executionId } });
	}
}
