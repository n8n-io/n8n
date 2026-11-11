import { getErrorMessage } from './get-error-message';

describe('getErrorMessage', () => {
	it('returns the message of an Error instance', () => {
		expect(getErrorMessage(new Error('original error'))).toBe('original error');
	});

	it('returns a string unchanged', () => {
		expect(getErrorMessage('something went wrong')).toBe('something went wrong');
	});

	it('returns the message of a plain error object', () => {
		expect(getErrorMessage({ name: 'NodeApiError', message: 'Credentials not found' })).toBe(
			'Credentials not found',
		);
	});

	it('returns the string form of an object', () => {
		expect(getErrorMessage({ code: 42 })).toBe('[object Object]');
		expect(getErrorMessage({ message: 42 })).toBe('[object Object]');
	});

	it('returns the string form of undefined', () => {
		expect(getErrorMessage(undefined)).toBe('undefined');
	});
});
