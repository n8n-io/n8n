import { BadRequest } from 'express-openapi-validator/dist/framework/types';
import { OperationalError, UnexpectedError, UserError } from 'n8n-workflow';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { LicenseEulaRequiredError } from '@/errors/response-errors/license-eula-required.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { classifyHttpError, HttpErrorKind, isResponseError } from '../http-error-classifier';

describe('classifyHttpError', () => {
	it('tags ResponseError with kind responseError and http fields', () => {
		const d = classifyHttpError(new NotFoundError('missing'));
		expect(d).toEqual({
			kind: HttpErrorKind.responseError,
			status: 404,
			message: 'missing',
			code: 404,
		});
	});

	it('tags UserError without HTTP status (serializers assign status)', () => {
		const d = classifyHttpError(new UserError('bad input'));
		expect(d).toEqual({
			kind: HttpErrorKind.userError,
			message: 'bad input',
		});
	});

	it('tags n8n UnexpectedError', () => {
		const d = classifyHttpError(new UnexpectedError('internal bug'));
		expect(d).toEqual({
			kind: HttpErrorKind.unexpectedError,
			message: 'internal bug',
		});
	});

	it('tags OperationalError as generic serverError', () => {
		const d = classifyHttpError(new OperationalError('temporarily down'));
		expect(d).toEqual({
			kind: HttpErrorKind.serverError,
			message: 'temporarily down',
		});
	});

	it('tags express-openapi-validator HttpError', () => {
		const err = new BadRequest({ path: '/x', message: 'schema failed' });
		const d = classifyHttpError(err);
		expect(d).toEqual({
			kind: HttpErrorKind.httpError,
			status: 400,
			message: 'schema failed',
		});
	});

	it('tags plain Error as serverError', () => {
		const d = classifyHttpError(new Error('plain'));
		expect(d).toEqual({
			kind: HttpErrorKind.serverError,
			message: 'plain',
		});
	});

	it('includes meta for LicenseEulaRequiredError', () => {
		const eulaUrl = 'https://n8n.io/legal/eula/';
		const d = classifyHttpError(
			new LicenseEulaRequiredError('License activation requires EULA acceptance', {
				eulaUrl,
			}),
		);
		expect(d.kind).toBe(HttpErrorKind.responseError);
		if (d.kind === HttpErrorKind.responseError) {
			expect(d.status).toBe(400);
			expect(d.meta).toEqual({ eulaUrl });
		}
	});

	it('matches BadRequestError fields', () => {
		const d = classifyHttpError(new BadRequestError('invalid'));
		expect(d).toEqual({
			kind: HttpErrorKind.responseError,
			status: 400,
			message: 'invalid',
			code: 400,
		});
	});
});

describe('isResponseError', () => {
	it('recognizes duck-typed hook errors', () => {
		const err = Object.assign(new Error('hook'), {
			httpStatusCode: 403,
			errorCode: 403,
		});
		expect(isResponseError(err)).toBe(true);
	});
});
