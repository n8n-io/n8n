import { OperationalError } from 'n8n-workflow';

export class TaskRunnerShutdownTimeoutError extends OperationalError {
	description =
		'The n8n instance began shutting down while the task was still running, so n8n stopped the task to finish shutting down in time. Retry the execution, or catch this error in an error workflow.';

	constructor() {
		super('Task aborted because the n8n instance was shutting down');
	}
}
