import { OperationalError } from 'n8n-workflow';

/**
 * @docs https://docs.bullmq.io/guide/workers/stalled-jobs
 */
export class MaxStalledCountError extends OperationalError {
	constructor(cause: Error) {
		super(
			'This execution failed to be processed too many times and will no longer retry. To allow this execution to complete, please break down your workflow or scale up your workers or adjust your worker settings.',
			{
				level: 'warning',
				cause,
			},
		);
	}
}
