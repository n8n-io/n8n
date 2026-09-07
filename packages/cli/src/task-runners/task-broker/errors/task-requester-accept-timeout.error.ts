import { OperationalError } from 'n8n-workflow';

export class TaskRequesterAcceptTimeoutError extends OperationalError {
	constructor(taskId: string, requesterId: string) {
		super(`Requester (${requesterId}) took too long to acknowledge task (${taskId})`);
	}
}
