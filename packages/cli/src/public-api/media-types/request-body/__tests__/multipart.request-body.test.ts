import { BadRequestError, ContentTooLargeError, InternalServerError } from '@n8n/errors';
import type { Request } from 'express';
import { MulterError } from 'multer';
import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import { multipartRequestBody, toPublicApiError } from '../multipart.request-body';

function fakeFile(fieldname: string): Express.Multer.File {
	return mock<Express.Multer.File>({ fieldname });
}

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

describe('multipartRequestBody', () => {
	describe('readInput', () => {
		it('merges text fields with files', () => {
			const req = {
				body: { workflowConflictPolicy: 'new-version' },
				files: [fakeFile('package')],
			} as unknown as Request;

			const input = multipartRequestBody.readInput(req) as Record<string, unknown>;

			expect(input.workflowConflictPolicy).toBe('new-version');
			expect(input.package).toMatchObject({ fieldname: 'package' });
		});

		it('collects several files under the same field name into an array', () => {
			const req = {
				body: {},
				files: [fakeFile('selectedWorkflowIds'), fakeFile('selectedWorkflowIds')],
			} as unknown as Request;

			const input = multipartRequestBody.readInput(req) as Record<string, unknown>;

			expect(Array.isArray(input.selectedWorkflowIds)).toBe(true);
			expect((input.selectedWorkflowIds as unknown[]).length).toBe(2);
		});

		it('merges a files map (req.files as a Record) the same way as an array', () => {
			const req = {
				body: {},
				files: { package: [fakeFile('package')] },
			} as unknown as Request;

			const input = multipartRequestBody.readInput(req) as Record<string, unknown>;

			expect(input.package).toMatchObject({ fieldname: 'package' });
		});

		it('handles a request with no files at all', () => {
			const req = { body: { a: '1' }, files: undefined } as unknown as Request;

			expect(multipartRequestBody.readInput(req)).toEqual({ a: '1' });
		});

		it('turns a part literally named __proto__ into an own key rather than the object prototype', () => {
			// Matches how multer actually builds `req.body` (`Object.create(null)`, then an assignment
			// per field) - a plain `{ __proto__: 'evil' }` literal wouldn't reproduce the same hazard,
			// since object-literal syntax special-cases that key as a prototype-setter instead of a key.
			const body: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
			body.__proto__ = 'evil';
			const req = { body, files: undefined } as unknown as Request;

			const input = multipartRequestBody.readInput(req) as Record<string, unknown>;

			expect(Object.getPrototypeOf(input)).toBeNull();
			expect(Object.prototype.hasOwnProperty.call(input, '__proto__')).toBe(true);
			expect(input.__proto__).toBe('evil');
		});

		it('turns a file part named __proto__ into an own key as well', () => {
			const req = {
				body: {},
				files: [fakeFile('__proto__')],
			} as unknown as Request;

			const input = multipartRequestBody.readInput(req) as Record<string, unknown>;

			expect(Object.prototype.hasOwnProperty.call(input, '__proto__')).toBe(true);
			expect(input.__proto__).toMatchObject({ fieldname: '__proto__' });
		});
	});

	describe('formatValidationError', () => {
		it('reports an unrecognized key as an unexpected form field', () => {
			const schema = z.object({ workflowConflictPolicy: z.string() }).strict();
			const result = schema.safeParse({ workflowConflictPolicy: 'new-version', evil: 'x' });

			assert(!result.success, 'expected an unrecognized-key error');

			expect(multipartRequestBody.formatValidationError(result.error)).toBe(
				'Unexpected form field "evil"',
			);
		});

		it('falls back to the default formatter for any other issue', () => {
			const schema = z.object({ workflowConflictPolicy: z.string() }).strict();
			const result = schema.safeParse({});

			assert(!result.success, 'expected a required-property error');

			expect(multipartRequestBody.formatValidationError(result.error)).toBe(
				"request/body must have required property 'workflowConflictPolicy'",
			);
		});
	});
});
