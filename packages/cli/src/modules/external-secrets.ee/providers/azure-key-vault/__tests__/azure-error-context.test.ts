import { AuthenticationError } from '@azure/identity';

import { azureErrorContext } from '../azure-error-context';

function createRestErrorLike(
	message: string,
	{ statusCode, code }: { statusCode?: number; code?: string },
): Error {
	return Object.assign(new Error(message), {
		name: 'RestError',
		statusCode,
		code,
	});
}

describe('azureErrorContext', () => {
	it('extracts statusCode and errorCode from RestError-like errors', () => {
		const error = createRestErrorLike('Permission denied', {
			statusCode: 403,
			code: 'Forbidden',
		});

		expect(azureErrorContext(error)).toEqual({
			statusCode: 403,
			errorCode: 'Forbidden',
		});
	});

	it('extracts errorCode from RestError-like errors without statusCode', () => {
		const error = createRestErrorLike('Connection failed', {
			code: 'REQUEST_SEND_ERROR',
		});

		expect(azureErrorContext(error)).toEqual({
			errorCode: 'REQUEST_SEND_ERROR',
		});
	});

	it('extracts statusCode and errorCode from AuthenticationError', () => {
		const error = new AuthenticationError(401, {
			error: 'invalid_client',
			error_description: 'Invalid client secret',
		});

		expect(azureErrorContext(error)).toEqual({
			statusCode: 401,
			errorCode: 'invalid_client',
		});
	});

	it('falls back to Error.name for generic errors', () => {
		expect(azureErrorContext(new Error('Something went wrong'))).toEqual({
			errorCode: 'Error',
		});
	});

	it('returns empty context for non-error values', () => {
		expect(azureErrorContext('not an error')).toEqual({});
		expect(azureErrorContext(null)).toEqual({});
	});
});
