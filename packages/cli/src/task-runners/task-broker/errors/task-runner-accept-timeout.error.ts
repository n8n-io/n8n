import { OperationalError } from 'n8n-workflow';

export class TaskRunnerAcceptTimeoutError extends OperationalError {
	constructor(taskId: string, runnerId: string) {
		super(`Runner (${runnerId}) took too long to acknowledge acceptance of task (${taskId})`, {
			level: 'warning',
		});
	}
}
