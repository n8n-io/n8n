import { getGcpErrorCode, gcpErrorContext } from '../gcp-error-context';

function createGrpcError(message: string, code: number): Error {
	return Object.assign(new Error(message), { code });
}

describe('getGcpErrorCode', () => {
	it('returns numeric gRPC status codes', () => {
		expect(getGcpErrorCode(createGrpcError('NOT_FOUND', 5))).toBe(5);
		expect(getGcpErrorCode(createGrpcError('PERMISSION_DENIED', 7))).toBe(7);
	});

	it('returns string error codes', () => {
		const error = Object.assign(new Error('Connection failed'), { code: 'ECONNREFUSED' });

		expect(getGcpErrorCode(error)).toBe('ECONNREFUSED');
	});

	it('falls back to Error.name for generic errors', () => {
		expect(getGcpErrorCode(new Error('Something went wrong'))).toBe('Error');
	});

	it('returns undefined for non-error values', () => {
		expect(getGcpErrorCode('not an error')).toBeUndefined();
		expect(getGcpErrorCode(null)).toBeUndefined();
	});
});

describe('gcpErrorContext', () => {
	it('extracts numeric gRPC status codes', () => {
		expect(gcpErrorContext(createGrpcError('NOT_FOUND', 5))).toEqual({ errorCode: 5 });
		expect(gcpErrorContext(createGrpcError('PERMISSION_DENIED', 7))).toEqual({ errorCode: 7 });
	});

	it('extracts string error codes', () => {
		const error = Object.assign(new Error('Connection failed'), { code: 'ECONNREFUSED' });

		expect(gcpErrorContext(error)).toEqual({ errorCode: 'ECONNREFUSED' });
	});

	it('falls back to Error.name for generic errors', () => {
		expect(gcpErrorContext(new Error('Something went wrong'))).toEqual({
			errorCode: 'Error',
		});
	});

	it('returns empty context for non-error values', () => {
		expect(gcpErrorContext('not an error')).toEqual({});
		expect(gcpErrorContext(null)).toEqual({});
	});
});
