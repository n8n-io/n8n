import { WrappedExecutionError } from '../errors/WrappedExecutionError';

describe('WrappedExecutionError', () => {
	it('copies custom properties from a JSON-serialized runner error', () => {
		const payload = { message: 'boom', description: 'line 3', lineNumber: 3 };
		const error = new WrappedExecutionError(payload);

		expect(error.message).toBe('boom');
		expect(error.description).toBe('line 3');
		expect(error.lineNumber).toBe(3);
		expect(error.cause).toBe(payload);
	});

	it('does not let the payload override identity and reporting properties', () => {
		const error = new WrappedExecutionError({
			message: 'boom',
			name: 'SomeRunnerError',
			level: 'error',
			shouldReport: true,
			stack: 'runner stack',
		});

		expect(error.name).toBe('WrappedExecutionError');
		expect(error.level).toBe('info');
		expect(error.shouldReport).toBe(false);
		expect(error.stack).not.toBe('runner stack');
	});

	it('falls back to a generic message when the payload has none', () => {
		const error = new WrappedExecutionError({ code: 1 });

		expect(error.message).toBe('Unknown error');
	});
});
