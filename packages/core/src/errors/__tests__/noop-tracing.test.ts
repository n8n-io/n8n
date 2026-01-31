import type { StartSpanOptions } from '@sentry/core';
import type Sentry from '@sentry/node';

import { NoopTracing } from '../noop-tracing';

describe('NoopTracing', () => {
	let noopTracing: NoopTracing;

	beforeEach(() => {
		noopTracing = new NoopTracing();
	});

	describe('startSpan', () => {
		it('should call the callback with undefined span', async () => {
			const options: StartSpanOptions = { name: 'test-span' };
			const callback = jest.fn().mockResolvedValue('result');

			await noopTracing.startSpan(options, callback);

			expect(callback).toHaveBeenCalledWith(undefined);
		});

		it('should return the result from the callback', async () => {
			const options: StartSpanOptions = { name: 'test-span' };
			const expectedResult = { data: 'test-data' };
			const callback = jest.fn().mockResolvedValue(expectedResult);

			const result = await noopTracing.startSpan(options, callback);

			expect(result).toEqual(expectedResult);
		});

		it('should propagate errors from the callback', async () => {
			const options: StartSpanOptions = { name: 'error-span' };
			const error = new Error('Callback error');
			const callback = jest.fn().mockRejectedValue(error);

			await expect(noopTracing.startSpan(options, callback)).rejects.toThrow('Callback error');
		});

		it('should handle async operations in callback', async () => {
			const options: StartSpanOptions = { name: 'async-span' };
			const callback = jest.fn().mockImplementation(async (_span?: Sentry.Span) => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return 'async-result';
			});

			const result = await noopTracing.startSpan(options, callback);

			expect(result).toBe('async-result');
			expect(callback).toHaveBeenCalledWith(undefined);
		});

		it('should handle nested calls', async () => {
			const outerOptions: StartSpanOptions = { name: 'outer-span' };
			const innerOptions: StartSpanOptions = { name: 'inner-span' };

			const outerCallback = jest.fn().mockImplementation(async (_span?: Sentry.Span) => {
				expect(_span).toBeUndefined();
				const innerCallback = jest.fn().mockImplementation(async (innerSpan?: Sentry.Span) => {
					expect(innerSpan).toBeUndefined();
					return 'inner-result';
				});
				return await noopTracing.startSpan(innerOptions, innerCallback);
			});

			const result = await noopTracing.startSpan(outerOptions, outerCallback);

			expect(result).toBe('inner-result');
			expect(outerCallback).toHaveBeenCalledWith(undefined);
		});

		it('should call callback exactly once', async () => {
			const options: StartSpanOptions = { name: 'test-span' };
			const callback = jest.fn().mockResolvedValue('result');

			await noopTracing.startSpan(options, callback);

			expect(callback).toHaveBeenCalledTimes(1);
		});
	});
});
