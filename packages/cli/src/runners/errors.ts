import { ApplicationError } from 'n8n-workflow';

export class TaskRejectError extends ApplicationError {
	constructor(public reason: string) {
		super(`Task rejected with reason: ${reason}`, { level: 'info' });
	}
}

export class TaskDeferredError extends ApplicationError {
	constructor() {
		super('Task deferred until runner is ready', { level: 'info' });
	}
}

export class TaskError extends ApplicationError {}
