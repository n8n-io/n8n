import {
	NON_RETRYABLE_STATUS_CODES,
	NON_RETRYABLE_RATE_LIMIT_CODES,
	getErrorStatus,
	getErrorCode,
	isCancellationError,
	isConnectionAbortError,
	isRetryableStatusCode,
	isRetryableRateLimitCode,
	classifyError,
	isRetryableError,
} from './error-classification';

describe('error-classification', () => {
	describe('NON_RETRYABLE_STATUS_CODES', () => {
		it('should not include 429 (rate limit)', () => {
			expect(NON_RETRYABLE_STATUS_CODES).not.toContain(429);
		});

		it('should include common client errors', () => {
			expect(NON_RETRYABLE_STATUS_CODES).toContain(400);
			expect(NON_RETRYABLE_STATUS_CODES).toContain(401);
			expect(NON_RETRYABLE_STATUS_CODES).toContain(403);
			expect(NON_RETRYABLE_STATUS_CODES).toContain(404);
		});
	});

	describe('NON_RETRYABLE_RATE_LIMIT_CODES', () => {
		it('should include insufficient_quota', () => {
			expect(NON_RETRYABLE_RATE_LIMIT_CODES).toContain('insufficient_quota');
		});

		it('should not include rate_limit_exceeded', () => {
			expect(NON_RETRYABLE_RATE_LIMIT_CODES).not.toContain('rate_limit_exceeded');
		});
	});

	describe('getErrorStatus', () => {
		it('should extract status from error.status', () => {
			expect(getErrorStatus({ status: 429 })).toBe(429);
		});

		it('should extract status from error.response.status', () => {
			expect(getErrorStatus({ response: { status: 500 } })).toBe(500);
		});

		it('should prefer error.response.status over error.status', () => {
			expect(getErrorStatus({ status: 400, response: { status: 500 } })).toBe(500);
		});

		it('should return undefined for non-object errors', () => {
			expect(getErrorStatus(null)).toBeUndefined();
			expect(getErrorStatus(undefined)).toBeUndefined();
			expect(getErrorStatus('string error')).toBeUndefined();
			expect(getErrorStatus(123)).toBeUndefined();
		});

		it('should return undefined when no status is present', () => {
			expect(getErrorStatus({})).toBeUndefined();
			expect(getErrorStatus({ message: 'error' })).toBeUndefined();
		});
	});

	describe('getErrorCode', () => {
		it('should extract code from error.code', () => {
			expect(getErrorCode({ code: 'insufficient_quota' })).toBe('insufficient_quota');
		});

		it('should return undefined for non-object errors', () => {
			expect(getErrorCode(null)).toBeUndefined();
			expect(getErrorCode(undefined)).toBeUndefined();
		});

		it('should return undefined when no code is present', () => {
			expect(getErrorCode({})).toBeUndefined();
		});
	});

	describe('isCancellationError', () => {
		it('should detect AbortError by name', () => {
			const error = new Error('Aborted');
			error.name = 'AbortError';
			expect(isCancellationError(error)).toBe(true);
		});

		it('should detect Cancel message prefix', () => {
			expect(isCancellationError({ message: 'Cancel: user requested' })).toBe(true);
		});

		it('should detect AbortError message prefix', () => {
			expect(isCancellationError({ message: 'AbortError: signal was aborted' })).toBe(true);
		});

		it('should return false for regular errors', () => {
			expect(isCancellationError(new Error('Network error'))).toBe(false);
			expect(isCancellationError({ message: 'Something failed' })).toBe(false);
		});

		it('should return false for non-object errors', () => {
			expect(isCancellationError(null)).toBe(false);
			expect(isCancellationError(undefined)).toBe(false);
		});
	});

	describe('isConnectionAbortError', () => {
		it('should detect ECONNABORTED', () => {
			expect(isConnectionAbortError({ code: 'ECONNABORTED' })).toBe(true);
		});

		it('should return false for other codes', () => {
			expect(isConnectionAbortError({ code: 'ECONNRESET' })).toBe(false);
			expect(isConnectionAbortError({ code: 'ETIMEDOUT' })).toBe(false);
		});

		it('should return false for non-object errors', () => {
			expect(isConnectionAbortError(null)).toBe(false);
		});
	});

	describe('isRetryableStatusCode', () => {
		it('should return false for 400 Bad Request', () => {
			expect(isRetryableStatusCode(400)).toBe(false);
		});

		it('should return false for 401 Unauthorized', () => {
			expect(isRetryableStatusCode(401)).toBe(false);
		});

		it('should return false for 403 Forbidden', () => {
			expect(isRetryableStatusCode(403)).toBe(false);
		});

		it('should return false for 404 Not Found', () => {
			expect(isRetryableStatusCode(404)).toBe(false);
		});

		it('should return true for 429 Too Many Requests (rate limit)', () => {
			expect(isRetryableStatusCode(429)).toBe(true);
		});

		it('should return true for 500 Internal Server Error', () => {
			expect(isRetryableStatusCode(500)).toBe(true);
		});

		it('should return true for 502 Bad Gateway', () => {
			expect(isRetryableStatusCode(502)).toBe(true);
		});

		it('should return true for 503 Service Unavailable', () => {
			expect(isRetryableStatusCode(503)).toBe(true);
		});

		it('should return true for undefined status', () => {
			expect(isRetryableStatusCode(undefined)).toBe(true);
		});
	});

	describe('isRetryableRateLimitCode', () => {
		it('should return false for insufficient_quota', () => {
			expect(isRetryableRateLimitCode('insufficient_quota')).toBe(false);
		});

		it('should return true for rate_limit_exceeded', () => {
			expect(isRetryableRateLimitCode('rate_limit_exceeded')).toBe(true);
		});

		it('should return true for unknown codes', () => {
			expect(isRetryableRateLimitCode('unknown_code')).toBe(true);
		});

		it('should return true for undefined', () => {
			expect(isRetryableRateLimitCode(undefined)).toBe(true);
		});
	});

	describe('classifyError', () => {
		it('should classify cancellation errors as non-retryable', () => {
			const error = new Error('Cancel');
			error.name = 'AbortError';

			const result = classifyError(error);

			expect(result.retryable).toBe(false);
			expect(result.reason).toBe('Request was cancelled');
		});

		it('should classify ECONNABORTED as non-retryable', () => {
			const result = classifyError({ code: 'ECONNABORTED' });

			expect(result.retryable).toBe(false);
			expect(result.reason).toBe('Connection was aborted');
		});

		it('should classify 401 errors as non-retryable', () => {
			const result = classifyError({ status: 401 });

			expect(result.retryable).toBe(false);
			expect(result.reason).toBe('HTTP 401 is not retryable');
		});

		it('should classify 429 errors as retryable', () => {
			const result = classifyError({ status: 429 });

			expect(result.retryable).toBe(true);
		});

		it('should classify insufficient_quota as non-retryable', () => {
			const result = classifyError({ status: 429, code: 'insufficient_quota' });

			expect(result.retryable).toBe(false);
			expect(result.reason).toBe("Error code 'insufficient_quota' is not retryable");
		});

		it('should classify rate_limit_exceeded as retryable', () => {
			const result = classifyError({ status: 429, code: 'rate_limit_exceeded' });

			expect(result.retryable).toBe(true);
		});

		it('should classify 500 errors as retryable', () => {
			const result = classifyError({ status: 500 });

			expect(result.retryable).toBe(true);
		});

		it('should classify errors without status as retryable', () => {
			const result = classifyError(new Error('Unknown error'));

			expect(result.retryable).toBe(true);
		});
	});

	describe('isRetryableError', () => {
		it('should return true for retryable errors', () => {
			expect(isRetryableError({ status: 429 })).toBe(true);
			expect(isRetryableError({ status: 500 })).toBe(true);
			expect(isRetryableError({ status: 429, code: 'rate_limit_exceeded' })).toBe(true);
		});

		it('should return false for non-retryable errors', () => {
			expect(isRetryableError({ status: 401 })).toBe(false);
			expect(isRetryableError({ status: 403 })).toBe(false);
			expect(isRetryableError({ code: 'insufficient_quota' })).toBe(false);
		});
	});
});
