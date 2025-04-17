export class TaskRunnerAcceptTimeoutError extends Error {
	constructor(taskId: string, runnerId: string) {
		super(`Runner (${runnerId}) took too long to acknowledge acceptance of task (${taskId})`);
	}
}
