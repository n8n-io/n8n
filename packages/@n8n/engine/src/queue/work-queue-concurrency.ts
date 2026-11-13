import { UnexpectedError } from '../common';

/** Returns `concurrency` if it is a positive integer, and throws if not. */
export function checkWorkQueueConcurrency(concurrency: number): number {
	if (!Number.isInteger(concurrency) || concurrency < 1) {
		throw new UnexpectedError(
			`work queue concurrency is ${concurrency}; it must be a positive integer`,
		);
	}
	return concurrency;
}
