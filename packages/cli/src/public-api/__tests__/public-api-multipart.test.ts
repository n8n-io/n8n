import type { Response } from 'express';
import { HttpError } from 'express-openapi-validator/dist/framework/types';
import multer from 'multer';

import { sendPublicApiErrorResponse } from '@/public-api/v1/public-api-error-response';

import { toPublicApiError } from '../public-api-multipart';

const createMockRes = () => {
	const payload: { statusCode?: number; body?: unknown } = {};
	const res = {
		_payload: payload,
		status: vi.fn(),
		json: vi.fn(),
	};
	res.status.mockImplementation((code: number) => {
		payload.statusCode = code;
		return res;
	});
	res.json.mockImplementation((body: unknown) => {
		payload.body = body;
		return res;
	});
	return res as typeof res & Response;
};

/**
 * Both sides go through `sendPublicApiErrorResponse`. `ourError` is what `toPublicApiError` mapped a
 * multer failure to; the eov side is what express-openapi-validator 5.5.3's own multipart middleware
 * produced for the same status and message (`HttpError.create`, see `openapi.multipart.js`). A
 * migrated route must keep the same status and body either way.
 */
function expectSameSerialization(ourError: Error, status: number, message: string) {
	const ours = createMockRes();
	sendPublicApiErrorResponse(ours, ourError);

	const eovs = createMockRes();
	sendPublicApiErrorResponse(eovs, HttpError.create({ status, path: '/api/v1/widgets', message }));

	expect(ours._payload).toEqual(eovs._payload);
	expect(ours._payload.statusCode).toBe(status);
}

describe('toPublicApiError', () => {
	it('maps a payload-too-big MulterError (LIMIT_FILE_SIZE) to the same 413 eov produced', () => {
		const multerError = new multer.MulterError('LIMIT_FILE_SIZE', 'package');

		expectSameSerialization(toPublicApiError(multerError), 413, multerError.message);
	});

	it('maps a payload-too-big MulterError (LIMIT_PART_COUNT) to the same 413 eov produced', () => {
		const multerError = new multer.MulterError('LIMIT_PART_COUNT');

		expectSameSerialization(toPublicApiError(multerError), 413, multerError.message);
	});

	it('maps an unexpected-field MulterError (LIMIT_UNEXPECTED_FILE) to the same 500 eov produced', () => {
		const multerError = new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'extra');

		expectSameSerialization(toPublicApiError(multerError), 500, multerError.message);
	});

	it('maps any other MulterError (LIMIT_FIELD_VALUE) to the same 400 eov produced', () => {
		const multerError = new multer.MulterError('LIMIT_FIELD_VALUE', 'name');

		expectSameSerialization(toPublicApiError(multerError), 400, multerError.message);
	});

	it('maps a missing-boundary error to the same 400 eov produced, with the eov wording', () => {
		const boundaryError = new Error('Multipart: Boundary not found');

		expectSameSerialization(toPublicApiError(boundaryError), 400, 'multipart file(s) required');
	});

	it('maps any other error to the same 500 eov produced', () => {
		const otherError = new Error('disk exploded');

		expectSameSerialization(toPublicApiError(otherError), 500, otherError.message);
	});
});
