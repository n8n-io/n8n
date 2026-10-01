import { BadRequestError, ContentTooLargeError, InternalServerError } from '@n8n/errors';
import { MulterError } from 'multer';

import { toPublicApiError } from '../multipart-errors';

describe('toPublicApiError', () => {
	it.each([
		['LIMIT_FILE_SIZE', 'File too large'],
		['LIMIT_FILE_COUNT', 'Too many files'],
		['LIMIT_PART_COUNT', 'Too many parts'],
	] as const)('maps %s to a 413 ContentTooLargeError', (code, message) => {
		const error = toPublicApiError(new MulterError(code));

		expect(error).toBeInstanceOf(ContentTooLargeError);
		expect(error.message).toBe(message);
	});

	it('maps LIMIT_UNEXPECTED_FILE to a 500 InternalServerError', () => {
		const error = toPublicApiError(new MulterError('LIMIT_UNEXPECTED_FILE'));

		expect(error).toBeInstanceOf(InternalServerError);
		expect(error.message).toBe('Unexpected field');
	});

	it('maps any other multer error to a 400 BadRequestError', () => {
		const error = toPublicApiError(new MulterError('LIMIT_FIELD_VALUE'));

		expect(error).toBeInstanceOf(BadRequestError);
		expect(error.message).toBe('Field value too long');
	});

	it('maps a missing-boundary error to the legacy 400 message', () => {
		const error = toPublicApiError(new Error('Multipart: Boundary not found'));

		expect(error).toBeInstanceOf(BadRequestError);
		expect(error.message).toBe('multipart file(s) required');
	});

	it('wraps an unrecognized error in an unmasked 500 InternalServerError', () => {
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
