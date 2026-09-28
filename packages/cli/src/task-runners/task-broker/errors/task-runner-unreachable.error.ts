import { OperationalError } from 'n8n-workflow';

export class TaskRunnerUnreachableError extends OperationalError {
	constructor(taskId: string, runnerId: string) {
		super(`Runner (${runnerId}) became unreachable while processing task (${taskId})`);
	}
}
