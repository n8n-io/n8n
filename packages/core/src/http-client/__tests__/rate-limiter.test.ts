import { mock } from 'jest-mock-extended';
import type { INode } from 'n8n-workflow';

import { withRetry } from '../rate-limiter';
import type { ResolvedRateLimitOptions } from '../types';

jest.mock('n8n-workflow', () => {
	const actual = jest.requireActual('n8n-workflow');
	return {
		...actual,
		sleep: jest.fn().mockResolvedValue(undefined),
	};
});

const { sleep } = jest.requireMock('n8n-workflow');

const mockNode = mock<INode>({ name: 'TestNode', type: 'test', typeVersion: 1 });
const getNode = () => mockNode;

const defaultOpts: ResolvedRateLimitOptions = {
	maxRetries: 3,
	retryAfterHeader: 'retry-after',
	initialDelay: 1000,
	backoffMultiplier: 2,
};

function create429Error(retryAfter?: string) {
	const error: Record<string, unknown> = {
		httpCode: '429',
		message: 'Too Many Requests',
	};
	if (retryAfter) {
		error.response = { headers: { 'retry-after': retryAfter } };
	}
	return error;
}

describe('withRetry', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should return result on success', async () => {
		const fn = jest.fn().mockResolvedValue({ data: 'ok' });
		const result = await withRetry(fn, defaultOpts, getNode);
		expect(result).toEqual({ data: 'ok' });
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('should retry on 429 with Retry-After header', async () => {
		const fn = jest
			.fn()
			.mockRejectedValueOnce(create429Error('5'))
			.mockResolvedValue({ data: 'ok' });

		const result = await withRetry(fn, defaultOpts, getNode);

		expect(result).toEqual({ data: 'ok' });
		expect(fn).toHaveBeenCalledTimes(2);
		expect(sleep).toHaveBeenCalledWith(5000); // 5 seconds * 1000
	});

	it('should use exponential backoff when no Retry-After header', async () => {
		const fn = jest
			.fn()
			.mockRejectedValueOnce(create429Error())
			.mockRejectedValueOnce(create429Error())
			.mockResolvedValue({ data: 'ok' });

		const result = await withRetry(fn, defaultOpts, getNode);

		expect(result).toEqual({ data: 'ok' });
		expect(fn).toHaveBeenCalledTimes(3);
		expect(sleep).toHaveBeenNthCalledWith(1, 1000); // 1000 * 2^0
		expect(sleep).toHaveBeenNthCalledWith(2, 2000); // 1000 * 2^1
	});

	it('should re-throw 429 error after max retries exceeded', async () => {
		const error429 = create429Error();
		const fn = jest.fn().mockRejectedValue(error429);

		await expect(withRetry(fn, defaultOpts, getNode)).rejects.toEqual(error429);
		expect(fn).toHaveBeenCalledTimes(4); // initial + 3 retries
		expect(sleep).toHaveBeenCalledTimes(3);
	});

	it('should throw non-429 errors immediately', async () => {
		const error = { httpCode: '500', message: 'Internal Server Error' };
		const fn = jest.fn().mockRejectedValue(error);

		await expect(withRetry(fn, defaultOpts, getNode)).rejects.toEqual(error);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('should throw non-HTTP errors immediately', async () => {
		const error = new Error('Network failure');
		const fn = jest.fn().mockRejectedValue(error);

		await expect(withRetry(fn, defaultOpts, getNode)).rejects.toThrow('Network failure');
		expect(fn).toHaveBeenCalledTimes(1);
	});
});
