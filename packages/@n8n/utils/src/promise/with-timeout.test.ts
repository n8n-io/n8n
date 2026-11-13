import { withTimeout } from './with-timeout';

const timeoutError = () => new Error('timed out');

describe('withTimeout', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('resolves with the value when the promise settles in time', async () => {
		await expect(withTimeout(Promise.resolve('done'), 100, timeoutError)).resolves.toBe('done');
	});

	it('rejects with the error of the promise when the promise rejects in time', async () => {
		const error = new Error('failed');

		await expect(withTimeout(Promise.reject(error), 100, timeoutError)).rejects.toBe(error);
	});

	it('rejects with the timeout error when the promise is not settled in time', async () => {
		const result = withTimeout(new Promise(() => {}), 100, timeoutError);
		const assertion = expect(result).rejects.toThrow('timed out');

		await vi.advanceTimersByTimeAsync(100);

		await assertion;
	});

	it('does not reject before the timeout', async () => {
		const onSettled = vi.fn();
		void withTimeout(new Promise(() => {}), 100, timeoutError).then(onSettled, onSettled);

		await vi.advanceTimersByTimeAsync(99);

		expect(onSettled).not.toHaveBeenCalled();
	});

	it('rounds a fractional timeout up', async () => {
		const onSettled = vi.fn();
		void withTimeout(new Promise(() => {}), 99.1, timeoutError).then(onSettled, onSettled);

		await vi.advanceTimersByTimeAsync(99);
		expect(onSettled).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(onSettled).toHaveBeenCalledTimes(1);
	});

	it('clears the timer when the promise settles first', async () => {
		await withTimeout(Promise.resolve('done'), 100, timeoutError);

		expect(vi.getTimerCount()).toBe(0);
	});
});
