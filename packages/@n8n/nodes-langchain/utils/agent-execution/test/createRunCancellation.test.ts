import { createRunCancellation } from '../createRunCancellation';

describe('createRunCancellation', () => {
	it('should abort the signal and throw the same error when the run rejects', async () => {
		const runCancellation = createRunCancellation();
		const error = new Error('A tool failed');

		await expect(runCancellation.abortOnFailure(Promise.reject(error))).rejects.toBe(error);

		expect(runCancellation.signal.aborted).toBe(true);
	});

	it('should keep the signal and return the result when the run resolves', async () => {
		const runCancellation = createRunCancellation();

		await expect(runCancellation.abortOnFailure(Promise.resolve('done'))).resolves.toBe('done');

		expect(runCancellation.signal.aborted).toBe(false);
	});

	it('should abort the signal when the execution is cancelled', () => {
		const execution = new AbortController();
		const runCancellation = createRunCancellation(execution.signal);

		execution.abort();

		expect(runCancellation.signal.aborted).toBe(true);
	});
});
