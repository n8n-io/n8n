import { n8nDefaultFailedAttemptHandler } from './n8nDefaultFailedAttemptHandler';

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
});
