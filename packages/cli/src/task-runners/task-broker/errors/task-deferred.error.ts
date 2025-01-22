import { ApplicationError } from 'n8n-workflow';

export class TaskDeferredError extends ApplicationError {
	constructor() {
		super('Task deferred until runner is ready', { level: 'info' });
	}
}
