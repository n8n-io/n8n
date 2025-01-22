import { ApplicationError } from 'n8n-workflow';

/**
 * @docs https://docs.bullmq.io/guide/workers/stalled-jobs
 */
export class MaxStalledCountError extends ApplicationError {
	constructor(cause: Error) {
		super('The execution has reached the maximum number of attempts and will no longer retry.', {
			level: 'warning',
			cause,
		});
	}
}
