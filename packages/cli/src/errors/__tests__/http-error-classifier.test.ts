import { LicenseEulaRequiredError } from '@/errors/response-errors/license-eula-required.error';
import { classifyHttpError, HttpErrorKind } from '@n8n/backend-services';
import {
	BadRequest,
	Forbidden,
	InternalServerError,
	MethodNotAllowed,
	NotAcceptable,
	NotFound,
	RequestEntityTooLarge,
	Unauthorized,
	UnsupportedMediaType,
} from 'express-openapi-validator/dist/framework/types';

describe('classifyHttpError', () => {
	it('includes meta for LicenseEulaRequiredError', () => {
		const eulaUrl = 'https://n8n.io/legal/eula/';
		const descriptor = classifyHttpError(
			new LicenseEulaRequiredError('License activation requires EULA acceptance', {
				eulaUrl,
			}),
		);

		expect(descriptor.kind).toBe(HttpErrorKind.responseError);
		if (descriptor.kind === HttpErrorKind.responseError) {
			expect(descriptor.status).toBe(400);
			expect(descriptor.meta).toEqual({ eulaUrl });
		}
	});

	it.each([
		[NotFound, 404],
		[NotAcceptable, 406],
		[MethodNotAllowed, 405],
		[BadRequest, 400],
		[RequestEntityTooLarge, 413],
		[InternalServerError, 500],
		[UnsupportedMediaType, 415],
		[Unauthorized, 401],
		[Forbidden, 403],
	])('classifies a %s from the CLI validator package', (ErrorClass, status) => {
		const error = new ErrorClass({ path: '/x', message: 'validator error' });

		expect(classifyHttpError(error)).toEqual({
			kind: HttpErrorKind.httpError,
			status,
			message: 'validator error',
		});
	});
});
