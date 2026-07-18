import {
	extractErrorMessage,
	isTransientNetworkError,
	MAX_EXEC_ATTEMPTS,
} from '../harness/transient-error';

describe('transient-error', () => {
	describe('extractErrorMessage', () => {
		it('folds an Error cause into the message when it adds detail', () => {
			// undici surfaces network failures as `TypeError: fetch failed` with the
			// real reason on `.cause`.
			const error = new TypeError('fetch failed', {
				cause: new Error('Headers Timeout Error'),
			});
			expect(extractErrorMessage(error)).toBe('fetch failed: Headers Timeout Error');
		});

		it('folds a string cause into the message', () => {
			const error = new Error('request failed', { cause: 'ECONNRESET' });
			expect(extractErrorMessage(error)).toBe('request failed: ECONNRESET');
		});

		it('returns the base message when there is no cause', () => {
			expect(extractErrorMessage(new Error('boom'))).toBe('boom');
		});

		it('does not duplicate when cause message equals base message', () => {
			const error = new Error('same', { cause: new Error('same') });
			expect(extractErrorMessage(error)).toBe('same');
		});

		it('stringifies non-Error throwables', () => {
			expect(extractErrorMessage('plain string')).toBe('plain string');
		});
	});

	describe('isTransientNetworkError', () => {
		it.each([
			'fetch failed',
			'fetch failed: Headers Timeout Error',
			'connect ECONNREFUSED 127.0.0.1:5678',
			'read ECONNRESET',
			'request to http://localhost timed out ETIMEDOUT',
			'getaddrinfo EAI_AGAIN localhost',
			'socket hang up',
		])('classifies %j as transient', (message) => {
			expect(isTransientNetworkError(message)).toBe(true);
		});

		it.each([
			'Sheet with ID __evalMockResource not found',
			'response.content.filter is not a function',
			'No trigger or start node found in the workflow',
		])('does not classify builder/mock failure %j as transient', (message) => {
			expect(isTransientNetworkError(message)).toBe(false);
		});
	});

	it('caps retries at a small positive number', () => {
		expect(MAX_EXEC_ATTEMPTS).toBeGreaterThan(1);
		expect(MAX_EXEC_ATTEMPTS).toBeLessThanOrEqual(5);
	});
});
