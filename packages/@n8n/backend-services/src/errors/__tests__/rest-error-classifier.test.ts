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

	it('does not classify an unrelated error with an HTTP error class name', () => {
		class NotFound extends Error {}

		const d = classifyRestError(new NotFound('internal error'));
		expect(d).toEqual({
			kind: RestErrorKind.serverError,
			message: 'internal error',
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
