import type { StartSpanOptions } from '@sentry/core';
import type Sentry from '@sentry/node';

import { NoopTracing } from '../noop-tracing';
import { Tracing, type TracingInterface } from '../tracing';

describe('Tracing', () => {
	let mockTracingImplementation: jest.Mocked<TracingInterface>;

	beforeEach(() => {
		mockTracingImplementation = {
			startSpan: jest.fn(),
		};

		Tracing.setTracingImplementation(new NoopTracing());
	});

	describe('setTracingImplementation', () => {
		it('should set the tracing implementation', async () => {
			Tracing.setTracingImplementation(mockTracingImplementation);

			const options: StartSpanOptions = { name: 'test-span' };
			const callback = jest.fn().mockResolvedValue('result');

			await Tracing.startSpan(options, callback);

			expect(mockTracingImplementation.startSpan).toHaveBeenCalledWith(options, callback);
		});
	});

	describe('startSpan', () => {
		it('should delegate to the current implementation', async () => {
			mockTracingImplementation.startSpan.mockResolvedValue('test-result');
			Tracing.setTracingImplementation(mockTracingImplementation);

			const options: StartSpanOptions = { name: 'test-span' };
			const callback = jest.fn().mockResolvedValue('callback-result');

			const result = await Tracing.startSpan(options, callback);

			expect(mockTracingImplementation.startSpan).toHaveBeenCalledWith(options, callback);
			expect(result).toBe('test-result');
		});

		it('should use NoopTracing by default', async () => {
			const options: StartSpanOptions = { name: 'test-span' };
			const callback = jest.fn().mockResolvedValue('callback-result');

			const result = await Tracing.startSpan(options, callback);

			// NoopTracing should call the callback with undefined span
			expect(callback).toHaveBeenCalledWith(undefined);
			expect(result).toBe('callback-result');
		});

		it('should pass options correctly to implementation', async () => {
			Tracing.setTracingImplementation(mockTracingImplementation);

			const options: StartSpanOptions = {
				name: 'complex-span',
				op: 'test.operation',
				attributes: {
					key1: 'value1',
					key2: 123,
				},
			};
			const callback = jest.fn();

			await Tracing.startSpan(options, callback);

			expect(mockTracingImplementation.startSpan).toHaveBeenCalledWith(options, callback);
		});

		it('should handle async callbacks correctly', async () => {
			Tracing.setTracingImplementation(mockTracingImplementation);

			const options: StartSpanOptions = { name: 'async-span' };
			const callback = jest.fn().mockImplementation(async (_span?: Sentry.Span) => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return 'async-result';
			});

			mockTracingImplementation.startSpan.mockImplementation(async (_opts, cb) => {
				return await cb(undefined);
			});

			const result = await Tracing.startSpan(options, callback);

			expect(result).toBe('async-result');
		});

		it('should propagate errors from the callback', async () => {
			Tracing.setTracingImplementation(mockTracingImplementation);

			const options: StartSpanOptions = { name: 'error-span' };
			const error = new Error('Callback error');
			const callback = jest.fn().mockRejectedValue(error);

			mockTracingImplementation.startSpan.mockImplementation(async (_opts, cb) => {
				return await cb(undefined);
			});

			await expect(Tracing.startSpan(options, callback)).rejects.toThrow('Callback error');
		});

		it('should propagate errors from the implementation', async () => {
			const error = new Error('Implementation error');
			mockTracingImplementation.startSpan.mockRejectedValue(error);
			Tracing.setTracingImplementation(mockTracingImplementation);

			const options: StartSpanOptions = { name: 'error-span' };
			const callback = jest.fn();

			await expect(Tracing.startSpan(options, callback)).rejects.toThrow('Implementation error');
		});
	});
});
