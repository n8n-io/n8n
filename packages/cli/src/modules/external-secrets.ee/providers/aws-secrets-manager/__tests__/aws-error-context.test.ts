import { awsErrorContext, getAwsErrorCode } from '../aws-error-context';

function createAwsSdkError(
	name: string,
	options: { httpStatusCode?: number; Code?: string; code?: string | number } = {},
): Error {
	return Object.assign(new Error(name), {
		name,
		...(options.Code !== undefined ? { Code: options.Code } : {}),
		...(options.code !== undefined ? { code: options.code } : {}),
		$metadata:
			options.httpStatusCode !== undefined ? { httpStatusCode: options.httpStatusCode } : {},
	});
}

describe('getAwsErrorCode', () => {
	it('returns legacy Code property', () => {
		const error = Object.assign(new Error('Access denied'), { Code: 'AccessDenied' });

		expect(getAwsErrorCode(error)).toBe('AccessDenied');
	});

	it('returns string error codes from code property', () => {
		const error = Object.assign(new Error('Connection failed'), { code: 'ECONNREFUSED' });

		expect(getAwsErrorCode(error)).toBe('ECONNREFUSED');
	});

	it('returns numeric error codes from code property', () => {
		const error = Object.assign(new Error('Timeout'), { code: 408 });

		expect(getAwsErrorCode(error)).toBe(408);
	});

	it('falls back to Error.name for AWS SDK exception names', () => {
		expect(getAwsErrorCode(createAwsSdkError('AccessDeniedException'))).toBe(
			'AccessDeniedException',
		);
	});

	it('falls back to Error.name for generic errors', () => {
		expect(getAwsErrorCode(new Error('Something went wrong'))).toBe('Error');
	});

	it('returns undefined for non-error values', () => {
		expect(getAwsErrorCode('not an error')).toBeUndefined();
		expect(getAwsErrorCode(null)).toBeUndefined();
	});
});

describe('awsErrorContext', () => {
	it('extracts AWS SDK exception name and HTTP status code', () => {
		expect(
			awsErrorContext(createAwsSdkError('AccessDeniedException', { httpStatusCode: 403 })),
		).toEqual({
			errorCode: 'AccessDeniedException',
			statusCode: 403,
		});
	});

	it('extracts legacy Code property', () => {
		expect(awsErrorContext(createAwsSdkError('Access denied', { Code: 'AccessDenied' }))).toEqual({
			errorCode: 'AccessDenied',
		});
	});

	it('extracts string error codes', () => {
		const error = Object.assign(new Error('Connection failed'), { code: 'ECONNREFUSED' });

		expect(awsErrorContext(error)).toEqual({ errorCode: 'ECONNREFUSED' });
	});

	it('falls back to Error.name for generic errors', () => {
		expect(awsErrorContext(new Error('Something went wrong'))).toEqual({
			errorCode: 'Error',
		});
	});

	it('returns empty context for non-error values', () => {
		expect(awsErrorContext('not an error')).toEqual({});
		expect(awsErrorContext(null)).toEqual({});
	});
});
