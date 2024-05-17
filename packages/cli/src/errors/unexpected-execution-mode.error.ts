import { ApplicationError } from 'n8n-workflow';

/**
 * Concurrency control operations apply only to executions in `manual`, `retry`, `webhook`, and `trigger` modes.
 */
export class UnexpectedExecutionModeError extends ApplicationError {
	constructor(mode: string) {
		super('Unexpected execution mode during concurrency control operation', { extra: { mode } });
	}
}
