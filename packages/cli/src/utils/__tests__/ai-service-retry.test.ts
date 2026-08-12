import { callAiServiceWithRetry } from '../ai-service-retry';

describe('callAiServiceWithRetry', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('resolves fast calls without interference', async () => {
		const call = vi.fn(async () => await Promise.resolve('ok'));

		await expect(callAiServiceWithRetry('Test call', call)).resolves.toBe('ok');
		expect(call).toHaveBeenCalledTimes(1);
	});

	it('times out a hung call and retries', async () => {
		vi.useFakeTimers();
		const logger = { warn: vi.fn() };
		const call = vi
			.fn()
			.mockImplementationOnce(async () => await new Promise<never>(() => {}))
			.mockResolvedValue('ok');

		const promise = callAiServiceWithRetry('Test call', call, logger);
		await vi.runAllTimersAsync();

		await expect(promise).resolves.toBe('ok');
		expect(call).toHaveBeenCalledTimes(2);
		expect(logger.warn).toHaveBeenCalledWith(
			'Test call hit a transient AI assistant service error; retrying',
			expect.objectContaining({ error: expect.stringContaining('timed out after') }),
		);
	});

	it('surfaces an OperationalError when every attempt hangs', async () => {
		vi.useFakeTimers();
		const errorReporter = { warn: vi.fn() };
		const call = vi.fn(async () => await new Promise<never>(() => {}));

		const promise = callAiServiceWithRetry('Test call', call, undefined, errorReporter);
		const assertion = expect(promise).rejects.toThrow(
			'The AI assistant service is temporarily unavailable',
		);
		await vi.runAllTimersAsync();

		await assertion;
		expect(call).toHaveBeenCalledTimes(3);
		expect(errorReporter.warn).toHaveBeenCalledTimes(1);
	});

	it('does not retry timed-out calls when timeout retries are disabled', async () => {
		vi.useFakeTimers();
		const errorReporter = { warn: vi.fn() };
		const call = vi.fn(async () => await new Promise<never>(() => {}));

		const promise = callAiServiceWithRetry('Test call', call, undefined, errorReporter, {
			retryOnTimeout: false,
		});
		const assertion = expect(promise).rejects.toThrow(
			'The AI assistant service is temporarily unavailable',
		);
		await vi.runAllTimersAsync();

		await assertion;
		expect(call).toHaveBeenCalledTimes(1);
		expect(errorReporter.warn).toHaveBeenCalledTimes(1);
	});

	it('does not retry definite client errors', async () => {
		const unauthorized = Object.assign(new Error('Unauthorized'), { statusCode: 401 });
		const call = vi.fn(async () => await Promise.reject(unauthorized));

		await expect(callAiServiceWithRetry('Test call', call)).rejects.toBe(unauthorized);
		expect(call).toHaveBeenCalledTimes(1);
	});

	it('keeps a late rejection from a timed-out call handled', async () => {
		vi.useFakeTimers();
		let rejectLate: ((error: Error) => void) | undefined;
		const call = vi
			.fn()
			.mockImplementationOnce(
				async () =>
					await new Promise<never>((_, reject) => {
						rejectLate = reject;
					}),
			)
			.mockResolvedValue('ok');

		const promise = callAiServiceWithRetry('Test call', call);
		await vi.runAllTimersAsync();
		await expect(promise).resolves.toBe('ok');

		// The first attempt rejects after already losing the race; must not crash the process.
		rejectLate?.(new Error('late failure'));
		await vi.runAllTimersAsync();
	});
});
