import { classifyHttpError } from '@/errors/http-error-classifier';
import {
	serializeInternalRestError,
	serializePublicApiError,
} from '@/errors/http-error-serializers';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { UnexpectedError, UserError } from 'n8n-workflow';

describe('http-error-serializers', () => {
	it('serializePublicApiError: minimal message for ResponseError', () => {
		const descriptor = classifyHttpError(new NotFoundError('x'));
		expect(serializePublicApiError(descriptor)).toEqual({
			status: 404,
			body: { message: 'x' },
		});
	});

	it('serializeInternalRestError: includes code for ResponseError', () => {
		const descriptor = classifyHttpError(new NotFoundError('x'));
		expect(serializeInternalRestError(descriptor)).toEqual({
			status: 404,
			body: {
				code: 404,
				message: 'x',
			},
		});
	});

	it('both serializers map UserError to 400', () => {
		const descriptor = classifyHttpError(new UserError('bad input'));
		expect(serializePublicApiError(descriptor)).toEqual({
			status: 400,
			body: { message: 'bad input' },
		});
		expect(serializeInternalRestError(descriptor)).toEqual({
			status: 400,
			body: { code: 0, message: 'bad input' },
		});
	});

	it('public sanitizes UnexpectedError; internal keeps message', () => {
		const descriptor = classifyHttpError(new UnexpectedError('secret'));
		expect(serializePublicApiError(descriptor)).toEqual({
			status: 500,
			body: { message: 'Internal server error' },
		});
		expect(serializeInternalRestError(descriptor)).toEqual({
			status: 500,
			body: { code: 0, message: 'secret' },
		});
	});
});
