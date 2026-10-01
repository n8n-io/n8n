import type { Request, Response } from 'express';
import { mock } from 'vitest-mock-extended';
import type { ZodError } from 'zod';

import { jsonRequestBody } from '../json.request-body';

describe('jsonRequestBody', () => {
	it('reads req.body unchanged', () => {
		const req = { body: { a: 1 } } as unknown as Request;

		expect(jsonRequestBody.readInput(req)).toBe(req.body);
	});

	it('formats a validation error the same way the shared field-level formatter does', () => {
		const error = {
			errors: [
				{ code: 'invalid_type', received: 'undefined', path: ['name'], message: 'Required' },
			],
		} as ZodError;

		expect(jsonRequestBody.formatValidationError(error)).toBe(
			"request/body must have required property 'name'",
		);
	});

	describe('createMiddleware', () => {
		function fakeReqRes(contentType: string | undefined) {
			const req = { headers: { 'content-type': contentType } } as unknown as Request;
			const res = mock<Response>();
			res.status.mockReturnValue(res);
			const next = vi.fn();
			return { req, res, next };
		}

		it('calls next() for application/json', () => {
			const { req, res, next } = fakeReqRes('application/json');
			const middleware = jsonRequestBody.createMiddleware({ mediaType: 'application/json' }, true);

			void middleware(req, res, next);

			expect(next).toHaveBeenCalledWith();
			expect(res.status).not.toHaveBeenCalled();
		});

		it('rejects a non-JSON media type with a 415', () => {
			const { req, res, next } = fakeReqRes('text/plain');
			const middleware = jsonRequestBody.createMiddleware({ mediaType: 'application/json' }, true);

			void middleware(req, res, next);

			expect(res.status).toHaveBeenCalledWith(415);
			expect(next).not.toHaveBeenCalled();
		});

		it('skips the check and calls next() when the body is optional and absent', () => {
			const { req, res, next } = fakeReqRes(undefined);
			const middleware = jsonRequestBody.createMiddleware({ mediaType: 'application/json' }, false);

			void middleware(req, res, next);

			expect(next).toHaveBeenCalledWith();
			expect(res.status).not.toHaveBeenCalled();
		});
	});
});
