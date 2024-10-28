import { ApplicationError } from 'n8n-workflow';

/**
 * See https://github.com/OptimalBits/bull/blob/60fa88f08637f0325639988a3f054880a04ce402/docs/README.md?plain=1#L133
 */
export class MaxStalledCountError extends ApplicationError {
	constructor(cause: Error) {
		super('The execution has reached the maximum number of attempts and will no longer retry.', {
			level: 'warning',
			cause,
		});
	}
}
