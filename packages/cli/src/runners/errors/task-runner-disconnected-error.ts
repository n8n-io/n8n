import { ApplicationError } from 'n8n-workflow';

export class TaskRunnerDisconnectedError extends ApplicationError {
	constructor(runnerId: string) {
		super(`Task runner (${runnerId}) disconnected`);
	}
}
