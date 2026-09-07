import { OperationalError } from 'n8n-workflow';

export class DuplicateExecutionError extends OperationalError {
	constructor(
		readonly deduplicationKey: string,
		cause?: Error,
	) {
		super(`Execution with deduplication key "${deduplicationKey}" already exists`, {
			cause,
		});
	}
}
