import { OperationalError } from '@n8n/errors';

export class JobReturnedToQueueError extends OperationalError {
	constructor(readonly jobId: string) {
		super(`Job ${jobId} was returned to the queue because the worker is stopping`);
	}
}
