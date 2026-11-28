import { OperationalError } from '@n8n/errors';

export class TaskRequestShutdownError extends OperationalError {
	description =
		'The n8n instance began shutting down before a runner could take this task, so n8n stopped waiting. Retry the execution, or catch this error in an error workflow.';

	constructor() {
		// Same title as a task stopped mid-run, so the two shutdown cases read as one cause.
		super('Task aborted because the n8n instance was shutting down');
	}
}
