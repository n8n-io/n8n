import type { Request, Response } from 'express';

import { createJitterMiddleware } from '../jitter';

describe('createJitterMiddleware', () => {
	let mockReq: Request;
	let mockRes: Response;
	let mockNext: jest.Mock;
	let randomSpy: jest.SpyInstance;

	beforeEach(() => {
		mockReq = {} as Request;
		mockRes = {} as Response;
		mockNext = jest.fn();
		jest.useFakeTimers();
		randomSpy = jest.spyOn(Math, 'random');
	});

	afterEach(() => {
		jest.useRealTimers();
		randomSpy.mockRestore();
	});

	it('should call next after delay based on random value', async () => {
		// Math.random() = 0.5 with range 100-200 gives: floor(0.5 * 101) + 100 = 150ms
		randomSpy.mockReturnValue(0.5);
		const middleware = createJitterMiddleware({ minMs: 100, maxMs: 200 });

		const promise = middleware(mockReq, mockRes, mockNext);

		expect(mockNext).not.toHaveBeenCalled();

		// Advance less than expected delay - next should not be called
		await jest.advanceTimersByTimeAsync(149);
		expect(mockNext).not.toHaveBeenCalled();

		// Advance to complete the delay
		await jest.advanceTimersByTimeAsync(1);
		await promise;

		expect(mockNext).toHaveBeenCalledTimes(1);
	});

	it('should use minimum delay when random returns 0', async () => {
		randomSpy.mockReturnValue(0);
		const middleware = createJitterMiddleware({ minMs: 100, maxMs: 200 });

		const promise = middleware(mockReq, mockRes, mockNext);

		await jest.advanceTimersByTimeAsync(100);
		await promise;

		expect(mockNext).toHaveBeenCalledTimes(1);
	});

	it('should use maximum delay when random returns ~1', async () => {
		randomSpy.mockReturnValue(0.999);
		const middleware = createJitterMiddleware({ minMs: 100, maxMs: 200 });

		const promise = middleware(mockReq, mockRes, mockNext);

		// Should need full 200ms
		await jest.advanceTimersByTimeAsync(199);
		expect(mockNext).not.toHaveBeenCalled();

		await jest.advanceTimersByTimeAsync(1);
		await promise;

		expect(mockNext).toHaveBeenCalledTimes(1);
	});

	it('should use default values (100-300ms) when no options provided', async () => {
		randomSpy.mockReturnValue(0);
		const middleware = createJitterMiddleware();

		const promise = middleware(mockReq, mockRes, mockNext);

		// Default min is 100ms
		await jest.advanceTimersByTimeAsync(100);
		await promise;

		expect(mockNext).toHaveBeenCalledTimes(1);
	});
});
