import { BadRequest, Unauthorized } from 'express-openapi-validator/dist/framework/types';

import {
	BadRequestError,
	NotFoundError,
	OperationalError,
	UnexpectedError,
	UserError,
} from '@n8n/errors';

import { classifyRestError, RestErrorKind, isResponseError } from '../rest-error-classifier';

describe('classifyRestError', () => {
	it('tags ResponseError with kind responseError and http fields', () => {
		const d = classifyRestError(new NotFoundError('missing'));
		expect(d).toEqual({
			kind: RestErrorKind.responseError,
			status: 404,
			message: 'missing',
			code: 404,
		});
	});

	it('tags UserError without HTTP status (serializers assign status)', () => {
		const d = classifyRestError(new UserError('bad input'));
		expect(d).toEqual({
			kind: RestErrorKind.userError,
			message: 'bad input',
		});
	});

	it('tags n8n UnexpectedError', () => {
		const d = classifyRestError(new UnexpectedError('internal bug'));
		expect(d).toEqual({
			kind: RestErrorKind.unexpectedError,
			message: 'internal bug',
		});
	});

	it('tags OperationalError as generic serverError', () => {
		const d = classifyRestError(new OperationalError('temporarily down'));
		expect(d).toEqual({
			kind: RestErrorKind.serverError,
			message: 'temporarily down',
		});
	});

	it('tags express-openapi-validator HttpError', () => {
		const httpError = new BadRequest({ path: '/x', message: 'schema failed' });
		const d = classifyRestError(httpError);
		expect(d).toEqual({
			kind: RestErrorKind.httpError,
			status: 400,
			message: 'schema failed',
		});
	});

	describe('Unauthorized', () => {
		it('keeps the express-openapi-validator message when no session cookie was sent', () => {
			const unauthorizedError = new Unauthorized({
				path: '/x',
				message: "'X-N8N-API-KEY' header required",
			});
			const d = classifyRestError(unauthorizedError);
			expect(d).toEqual({
				kind: RestErrorKind.httpError,
				status: 401,
				message: "'X-N8N-API-KEY' header required",
			});
		});

		it('replaces the api key hint with a generic message when a session cookie was sent', () => {
			const unauthorizedError = new Unauthorized({
				path: '/x',
				message: "'X-N8N-API-KEY' header required",
			});
			const d = classifyRestError(unauthorizedError, { hasSessionCookie: true });
			expect(d).toEqual({
				kind: RestErrorKind.httpError,
				status: 401,
				message: 'Unauthorized',
			});
		});
	});

	it('does not classify an unrelated error with an HTTP error class name', () => {
		class NotFound extends Error {}

		const d = classifyRestError(new NotFound('internal error'));
		expect(d).toEqual({
			kind: RestErrorKind.serverError,
			message: 'internal error',
		});
	});

	it.each([
		['HttpError', 400],
		['NotFound', 404],
		['NotAcceptable', 406],
		['MethodNotAllowed', 405],
		['BadRequest', 400],
		['RequestEntityTooLarge', 413],
		['InternalServerError', 500],
		['UnsupportedMediaType', 415],
		['Unauthorized', 401],
		['Forbidden', 403],
	])('recognizes a validator %s error from another package instance', (className, status) => {
		const CrossPackageError = {
			[className]: class extends Error {
				readonly status = status;
			},
		}[className];
		const error = new CrossPackageError('validator error');

		expect(classifyRestError(error)).toEqual({
			kind: RestErrorKind.httpError,
			status,
			message: 'validator error',
		});
	});

	it('tags plain Error as serverError', () => {
		const d = classifyRestError(new Error('plain'));
		expect(d).toEqual({
			kind: RestErrorKind.serverError,
			message: 'plain',
		});
	});

	it('matches BadRequestError fields', () => {
		const d = classifyRestError(new BadRequestError('invalid'));
		expect(d).toEqual({
			kind: RestErrorKind.responseError,
			status: 400,
			message: 'invalid',
			code: 400,
		});
	});
});

describe('isResponseError', () => {
	it('recognizes duck-typed hook errors', () => {
		const hookError = Object.assign(new Error('hook'), {
			httpStatusCode: 403,
			errorCode: 403,
		});
		expect(isResponseError(hookError)).toBe(true);
	});
});
