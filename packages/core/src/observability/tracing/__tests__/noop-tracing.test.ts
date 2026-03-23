import { EmptySpan, NoopTracing } from '../noop-tracing';
import type { Span, StartSpanOpts } from '../tracing';

describe('NoopTracing', () => {
	let noopTracing: NoopTracing;

	beforeEach(() => {
		noopTracing = new NoopTracing();
	});

	describe('startSpan', () => {
		it('should call the callback with EmptySpan', async () => {
			const options: StartSpanOpts = { name: 'test-span' };
			const callback = jest.fn().mockResolvedValue('result');

			await noopTracing.startSpan(options, callback);

			expect(callback).toHaveBeenCalledWith(expect.any(EmptySpan));
		});

		it('should return the result from the callback', async () => {
			const options: StartSpanOpts = { name: 'test-span' };
			const expectedResult = { data: 'test-data' };
			const callback = jest.fn().mockResolvedValue(expectedResult);

			const result = await noopTracing.startSpan(options, callback);

			expect(result).toEqual(expectedResult);
		});

		it('should propagate errors from the callback', async () => {
			const options: StartSpanOpts = { name: 'error-span' };
			const error = new Error('Callback error');
			const callback = jest.fn().mockRejectedValue(error);

			await expect(noopTracing.startSpan(options, callback)).rejects.toThrow('Callback error');
		});

		it('should handle async operations in callback', async () => {
			const options: StartSpanOpts = { name: 'async-span' };
			const callback = jest.fn().mockImplementation(async (_span: Span) => {
				await new Promise((resolve) => setTimeout(resolve, 10));
				return 'async-result';
			});

			const result = await noopTracing.startSpan(options, callback);

			expect(result).toBe('async-result');
			expect(callback).toHaveBeenCalledWith(expect.any(EmptySpan));
		});

		it('should handle nested calls', async () => {
			const outerOptions: StartSpanOpts = { name: 'outer-span' };
			const innerOptions: StartSpanOpts = { name: 'inner-span' };

			const outerCallback = jest.fn().mockImplementation(async (_span: Span) => {
				expect(_span).toBeInstanceOf(EmptySpan);
				const innerCallback = jest.fn().mockImplementation(async (innerSpan: Span) => {
					expect(innerSpan).toBeInstanceOf(EmptySpan);
					return 'inner-result';
				});
				return await noopTracing.startSpan(innerOptions, innerCallback);
			});

			const result = await noopTracing.startSpan(outerOptions, outerCallback);

			expect(result).toBe('inner-result');
			expect(outerCallback).toHaveBeenCalledWith(expect.any(EmptySpan));
		});

		it('should call callback exactly once', async () => {
			const options: StartSpanOpts = { name: 'test-span' };
			const callback = jest.fn().mockResolvedValue('result');

			await noopTracing.startSpan(options, callback);

			expect(callback).toHaveBeenCalledTimes(1);
		});
	});
});
