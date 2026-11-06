import { AsyncCaller } from '@langchain/core/utils/async_caller';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { NodeApiError, UnexpectedError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { makeN8nLlmFailedAttemptHandler } from 'src/utils/failed-attempt-handler/n8nLlmFailedAttemptHandler';

describe('makeN8nLlmFailedAttemptHandler', () => {
	const ctx = mock<ISupplyDataFunctions>({
		getNode: vi.fn(),
	});

	it('should not throw a retryable error, when NO custom handler is provided', () => {
		const handler = makeN8nLlmFailedAttemptHandler(ctx);

		expect(() => handler(new Error('Test error'))).not.toThrow();
	});

	it('should not throw a retryable error when custom handler is provided', () => {
		const customHandler = vi.fn();
		const handler = makeN8nLlmFailedAttemptHandler(ctx, customHandler);

		expect(() => handler(new Error('Test error'))).not.toThrow();
		expect(customHandler).toHaveBeenCalled();
	});

	it('should throw wrapped exception from custom handler', () => {
		const customHandler = vi.fn(() => {
			throw new UnexpectedError('Custom handler error');
		});
		const handler = makeN8nLlmFailedAttemptHandler(ctx, customHandler);

		expect(() => handler(new Error('Test error'))).toThrow('Custom handler error');
		expect(customHandler).toHaveBeenCalled();
	});

	it('should throw NodeApiError when the default handler rejects and the custom one does not', () => {
		const handler = makeN8nLlmFailedAttemptHandler(ctx, vi.fn());

		expect(() => handler(Object.assign(new Error('Bad request'), { status: 400 }))).toThrow(
			NodeApiError,
		);
	});

	describe('through AsyncCaller', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const rateLimited = () => Object.assign(new Error('429'), { status: 429 });

		it('should retry through AsyncCaller up to maxRetries', async () => {
			const caller = new AsyncCaller({
				maxRetries: 2,
				onFailedAttempt: makeN8nLlmFailedAttemptHandler(ctx),
			});
			const callable = vi
				.fn()
				.mockRejectedValueOnce(rateLimited())
				.mockRejectedValueOnce(rateLimited())
				.mockResolvedValueOnce('ok');

			const pending = caller.call(callable);
			await vi.runAllTimersAsync();

			await expect(pending).resolves.toBe('ok');
			expect(callable).toHaveBeenCalledTimes(3);
		});

		it('should surface the last error when retries are spent', async () => {
			const caller = new AsyncCaller({
				maxRetries: 2,
				onFailedAttempt: makeN8nLlmFailedAttemptHandler(ctx),
			});
			const error = rateLimited();
			const callable = vi.fn().mockRejectedValue(error);

			const pending = caller.call(callable);
			// Attach the rejection handler before the timers drain so the rejection is not unhandled
			const result = expect(pending).rejects.toBe(error);
			await vi.runAllTimersAsync();

			await result;
			expect(callable).toHaveBeenCalledTimes(3);
		});

		it('should honour retryAfterMs in the delay', async () => {
			const caller = new AsyncCaller({
				maxRetries: 2,
				onFailedAttempt: makeN8nLlmFailedAttemptHandler(ctx),
			});
			const error = Object.assign(new Error('429'), {
				status: 429,
				headers: new Headers({ 'retry-after': '5' }),
			});
			const callable = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('ok');

			const pending = caller.call(callable);
			await vi.advanceTimersByTimeAsync(4999);
			expect(callable).toHaveBeenCalledTimes(1);

			await vi.advanceTimersByTimeAsync(1);
			expect(callable).toHaveBeenCalledTimes(2);
			await expect(pending).resolves.toBe('ok');
		});
	});
});
