import { OperationalError } from '@n8n/errors';

export class ExecutionAlreadyResumingError extends OperationalError {
	/**
	 * True when this process holds the resume guard. The holder may release the guard
	 * without resuming the execution, so a failed claim is worth retrying.
	 */
	readonly local: boolean;

	constructor(executionId: string, options: { local?: boolean } = {}) {
		super('Execution is already being resumed by another process', { extra: { executionId } });
		this.local = options.local ?? false;
	}
}
