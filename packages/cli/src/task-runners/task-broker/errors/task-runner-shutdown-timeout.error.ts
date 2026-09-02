import { OperationalError } from 'n8n-workflow';

export class TaskRunnerShutdownTimeoutError extends OperationalError {
	description =
		'This n8n instance began shutting down while the task was still running, so the task was aborted to let the shutdown complete in time. You can retry the execution, or catch this error in an error workflow.';

	constructor() {
		super('Task was aborted because the n8n instance is shutting down');
	}
}
