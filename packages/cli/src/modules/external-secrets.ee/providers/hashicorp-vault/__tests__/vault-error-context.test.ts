import { vaultErrorContext } from '../vault-error-context';

describe('vaultErrorContext', () => {
	it('extracts statusCode from HTTP request errors without duplicating it in errorCode', () => {
		const error = Object.assign(new Error('Request failed'), {
			response: { status: 403 },
		});

		expect(vaultErrorContext(error)).toEqual({
			statusCode: 403,
		});
	});

	it('extracts errorCode from transport errors', () => {
		const error = Object.assign(new Error('Connection refused'), {
			code: 'ECONNREFUSED',
		});

		expect(vaultErrorContext(error)).toEqual({
			errorCode: 'ECONNREFUSED',
		});
	});

	it('falls back to Error.name for generic errors', () => {
		expect(vaultErrorContext(new Error('Something went wrong'))).toEqual({
			errorCode: 'Error',
		});
	});

	it('returns empty context for non-error values', () => {
		expect(vaultErrorContext('not an error')).toEqual({});
		expect(vaultErrorContext(null)).toEqual({});
	});
});
