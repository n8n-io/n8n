import type { StartSpanOptions } from '@sentry/core';
import type Sentry from '@sentry/node';
import { mock, mockClear } from 'jest-mock-extended';

import { SentryTracing } from '../sentry-tracing';

describe('SentryTracing', () => {
	let sentryTracing: SentryTracing;
	const mockSentry = mock({
		startSpan: jest.fn(),
	});

	beforeEach(() => {
		mockClear(mockSentry);

		sentryTracing = new SentryTracing(mockSentry);
	});

	describe('startSpan', () => {
		it('should call sentry.startSpan with the provided options', async () => {
			const options: StartSpanOptions = { name: 'test-span' };
			const callback = jest.fn().mockResolvedValue('result');

			mockSentry.startSpan.mockImplementation(async (_opts, cb) => {
				return await cb({} as Sentry.Span);
			});

			await sentryTracing.startSpan(options, callback);

			expect(mockSentry.startSpan).toHaveBeenCalledWith(options, expect.any(Function));
		});

		it('should pass span to the callback', async () => {
			const options: StartSpanOptions = { name: 'test-span' };
			const mockSpan = { name: 'mock-span' } as unknown as Sentry.Span;
			const callback = jest.fn().mockResolvedValue('result');

			mockSentry.startSpan.mockImplementation(async (_opts, cb) => {
				return await cb(mockSpan);
			});

			await sentryTracing.startSpan(options, callback);

			expect(callback).toHaveBeenCalledWith(mockSpan);
		});

		it('should return the result from the callback', async () => {
			const options: StartSpanOptions = { name: 'test-span' };
			const expectedResult = { data: 'test-data' };
			const callback = jest.fn().mockResolvedValue(expectedResult);

			mockSentry.startSpan.mockImplementation(async (_opts, cb) => {
				return await cb({} as Sentry.Span);
			});

			const result = await sentryTracing.startSpan(options, callback);

			expect(result).toEqual(expectedResult);
		});

		it('should propagate errors from the callback', async () => {
			const options: StartSpanOptions = { name: 'error-span' };
			const error = new Error('Callback error');
			const callback = jest.fn().mockRejectedValue(error);

			mockSentry.startSpan.mockImplementation(async (_opts, cb) => {
				return await cb({} as Sentry.Span);
			});

			await expect(sentryTracing.startSpan(options, callback)).rejects.toThrow('Callback error');
		});

		it('should propagate errors from sentry.startSpan', async () => {
			const options: StartSpanOptions = { name: 'error-span' };
			const error = new Error('Sentry error');
			const callback = jest.fn();

			(mockSentry.startSpan as jest.Mock).mockRejectedValue(error);

			await expect(sentryTracing.startSpan(options, callback)).rejects.toThrow('Sentry error');
		});

		it('should handle async operations in callback', async () => {
			const options: StartSpanOptions = { name: 'async-span' };
			const callback = jest.fn().mockImplementation(async (_span: Sentry.Span) => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return 'async-result';
			});

			mockSentry.startSpan.mockImplementation(async (_opts, cb) => {
				return await cb({} as Sentry.Span);
			});

			const result = await sentryTracing.startSpan(options, callback);

			expect(result).toBe('async-result');
			expect(callback).toHaveBeenCalledWith(expect.any(Object));
		});

		it('should maintain span context through nested calls', async () => {
			const outerOptions: StartSpanOptions = { name: 'outer-span' };
			const innerOptions: StartSpanOptions = { name: 'inner-span' };

			const outerSpan = { name: 'outer' } as unknown as Sentry.Span;
			const innerSpan = { name: 'inner' } as unknown as Sentry.Span;

			mockSentry.startSpan
				.mockImplementationOnce(async (_opts, cb) => {
					return await cb(outerSpan);
				})
				.mockImplementationOnce(async (_opts, cb) => {
					return await cb(innerSpan);
				});

			const outerCallback = jest.fn().mockImplementation(async (_span: Sentry.Span) => {
				const innerCallback = jest.fn().mockResolvedValue('inner-result');
				return await sentryTracing.startSpan(innerOptions, innerCallback);
			});

			const result = await sentryTracing.startSpan(outerOptions, outerCallback);

			expect(result).toBe('inner-result');
			expect(mockSentry.startSpan).toHaveBeenCalledTimes(2);
		});
	});
});
