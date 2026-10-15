import { n8nDefaultFailedAttemptHandler } from 'src/utils/failed-attempt-handler/n8nDefaultFailedAttemptHandler';

class MockHttpError extends Error {
	response: { status: number };

	constructor(message: string, code: number) {
		super(message);
		this.response = { status: code };
	}
}

describe('n8nDefaultFailedAttemptHandler', () => {
	it('should throw error if message starts with "Cancel"', () => {
		const error = new Error('Cancel operation');
		expect(() => n8nDefaultFailedAttemptHandler(error)).toThrow(error);
	});

	it('should throw error if message starts with "AbortError"', () => {
		const error = new Error('AbortError occurred');
		expect(() => n8nDefaultFailedAttemptHandler(error)).toThrow(error);
	});

	it('should throw error if name is "AbortError"', () => {
		class MockAbortError extends Error {
			constructor() {
				super('Some error');
				this.name = 'AbortError';
			}
		}

		const error = new MockAbortError();

		expect(() => n8nDefaultFailedAttemptHandler(error)).toThrow(error);
	});

	it('should throw error if code is "ECONNABORTED"', () => {
		class MockAbortError extends Error {
			code: string;

			constructor() {
				super('Some error');
				this.code = 'ECONNABORTED';
			}
		}

		const error = new MockAbortError();
		expect(() => n8nDefaultFailedAttemptHandler(error)).toThrow(error);
	});

	it('should throw error if status is in STATUS_NO_RETRY', () => {
		const error = new MockHttpError('Some error', 400);
		expect(() => n8nDefaultFailedAttemptHandler(error)).toThrow(error);
	});

	it('should not throw error if status is not in STATUS_NO_RETRY', () => {
		const error = new MockHttpError('Some error', 500);
		error.response = { status: 500 };

		expect(() => n8nDefaultFailedAttemptHandler(error)).not.toThrow();
	});

	it('should not throw error if no conditions are met', () => {
		const error = new Error('Some random error');
		expect(() => n8nDefaultFailedAttemptHandler(error)).not.toThrow();
	});

	it('should not retry a 413', () => {
		const error = new MockHttpError('Too large', 413);
		expect(() => n8nDefaultFailedAttemptHandler(error)).toThrow(error);
	});

	describe('429', () => {
		it.each([
			[
				'top-level code',
				Object.assign(new Error('quota'), { status: 429, code: 'insufficient_quota' }),
			],
			[
				'nested code',
				Object.assign(new Error('quota'), { status: 429, error: { code: 'insufficient_quota' } }),
			],
		])('should throw when a 429 carries the insufficient_quota code (%s)', (_, error) => {
			expect(() => n8nDefaultFailedAttemptHandler(error)).toThrow(error);
			expect(error).not.toHaveProperty('retryAfterMs');
		});

		it('should throw when a 429 message says the quota is exhausted', () => {
			const error = Object.assign(new Error('Your credit balance is too low'), { status: 429 });
			expect(() => n8nDefaultFailedAttemptHandler(error)).toThrow(error);
			expect(error).not.toHaveProperty('retryAfterMs');
		});

		it('should read Retry-After from the message when there is no header', () => {
			const error = Object.assign(new Error('Rate limited. Please try again in 20 seconds.'), {
				status: 429,
			});
			expect(() => n8nDefaultFailedAttemptHandler(error)).not.toThrow();
			expect(error).toHaveProperty('retryAfterMs', 20000);
		});

		it('should not throw for a 429 without a Retry-After header', () => {
			const error = new MockHttpError('Rate limited', 429);
			expect(() => n8nDefaultFailedAttemptHandler(error)).not.toThrow();
			expect(error).not.toHaveProperty('retryAfterMs');
		});

		it('should pass Retry-After to the retry loop', () => {
			const error = Object.assign(new Error('Rate limited'), {
				status: 429,
				headers: new Headers({ 'retry-after': '5' }),
			});
			expect(() => n8nDefaultFailedAttemptHandler(error)).not.toThrow();
			expect(error).toHaveProperty('retryAfterMs', 5000);
		});

		it('should pass a Retry-After of exactly a minute to the retry loop', () => {
			const error = Object.assign(new Error('Rate limited'), {
				status: 429,
				headers: new Headers({ 'retry-after': '60' }),
			});
			expect(() => n8nDefaultFailedAttemptHandler(error)).not.toThrow();
			expect(error).toHaveProperty('retryAfterMs', 60000);
		});

		it('should throw when Retry-After is longer than a minute', () => {
			const error = Object.assign(new Error('Rate limited'), {
				status: 429,
				headers: new Headers({ 'retry-after': '120' }),
			});
			expect(() => n8nDefaultFailedAttemptHandler(error)).toThrow(error);
			expect(error).not.toHaveProperty('retryAfterMs');
		});
	});
});
