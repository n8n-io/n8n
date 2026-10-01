import { BadRequestError, ContentTooLargeError, InternalServerError } from '@n8n/errors';

import { toPublicApiError } from '../multipart-errors';

class FakeMulterError extends Error {
	code: string;

	constructor(code: string, message: string) {
		super(message);
		this.name = 'MulterError';
		this.code = code;
	}
}

describe('toPublicApiError', () => {
	it.each(['LIMIT_FILE_SIZE', 'LIMIT_FILE_COUNT', 'LIMIT_PART_COUNT'])(
		'maps %s to a 413 ContentTooLargeError',
		(code) => {
			const error = toPublicApiError(new FakeMulterError(code, 'too big'));

			expect(error).toBeInstanceOf(ContentTooLargeError);
			expect(error.message).toBe('too big');
		},
	);

	it('maps LIMIT_UNEXPECTED_FILE to a 500 InternalServerError', () => {
		const error = toPublicApiError(
			new FakeMulterError('LIMIT_UNEXPECTED_FILE', 'Unexpected field'),
		);

		expect(error).toBeInstanceOf(InternalServerError);
		expect(error.message).toBe('Unexpected field');
	});

	it('maps any other multer error to a 400 BadRequestError', () => {
		const error = toPublicApiError(
			new FakeMulterError('LIMIT_FIELD_VALUE', 'Field value too long'),
		);

		expect(error).toBeInstanceOf(BadRequestError);
		expect(error.message).toBe('Field value too long');
	});

	it('maps a missing-boundary error to the legacy 400 message', () => {
		const error = toPublicApiError(new Error('Multipart: Boundary not found'));

		expect(error).toBeInstanceOf(BadRequestError);
		expect(error.message).toBe('multipart file(s) required');
	});

	it('wraps an unrecognised error in an unmasked 500 InternalServerError', () => {
		const error = toPublicApiError(new Error('Unexpected end of form'));

		expect(error).toBeInstanceOf(InternalServerError);
		expect(error.message).toBe('Unexpected end of form');
	});

	it('stringifies a thrown non-Error value', () => {
		const error = toPublicApiError('disk exploded');

		expect(error).toBeInstanceOf(InternalServerError);
		expect(error.message).toBe('disk exploded');
	});
});
