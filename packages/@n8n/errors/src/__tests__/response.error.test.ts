import { BaseError } from '../base.error';
import { BadRequestError } from '../response-errors/bad-request.error';
import { InternalServerError } from '../response-errors/internal-server.error';
import { NotFoundError } from '../response-errors/not-found.error';
import { ResponseError } from '../response-errors/response.error';
import { ServiceUnavailableError } from '../response-errors/service-unavailable.error';

class TestResponseError extends ResponseError {}

describe('ResponseError', () => {
	it('should default errorCode to httpStatusCode', () => {
		const error = new TestResponseError('test', 418);
		expect(error).toBeInstanceOf(BaseError);
		expect(error.httpStatusCode).toBe(418);
		expect(error.errorCode).toBe(418);
		expect(error.hint).toBeUndefined();
	});

	it('should keep errorCode, hint and cause', () => {
		const cause = new Error('root');
		const error = new TestResponseError('test', 400, 4001, 'try again', cause);
		expect(error.errorCode).toBe(4001);
		expect(error.hint).toBe('try again');
		expect(error.cause).toBe(cause);
	});

	it.each([
		[400, 'warning'],
		[499, 'warning'],
		[500, 'error'],
		[502, 'info'],
		[504, 'info'],
		[505, 'error'],
	] as const)('should set level for status %i to %s', (status, level) => {
		expect(new TestResponseError('test', status).level).toBe(level);
	});
});

describe('HTTP errors', () => {
	it('NotFoundError should set 404 and the hint', () => {
		const error = new NotFoundError('missing', 'check the id');
		expect(error).toBeInstanceOf(ResponseError);
		expect(error.httpStatusCode).toBe(404);
		expect(error.errorCode).toBe(404);
		expect(error.hint).toBe('check the id');
	});

	it('NotFoundError.isDefinedAndNotNull should throw for null and undefined', () => {
		expect(() => NotFoundError.isDefinedAndNotNull(null, 'missing')).toThrow(NotFoundError);
		expect(() => NotFoundError.isDefinedAndNotNull(undefined, 'missing')).toThrow(NotFoundError);
		expect(() => NotFoundError.isDefinedAndNotNull(0, 'missing')).not.toThrow();
	});

	it('BadRequestError should set 400 and keep a custom errorCode', () => {
		const error = new BadRequestError('bad', 4002, 'fix the input');
		expect(error.httpStatusCode).toBe(400);
		expect(error.errorCode).toBe(4002);
		expect(error.hint).toBe('fix the input');
	});

	it('BadRequestError.wrap should keep the cause', () => {
		const cause = new Error('root');
		const error = BadRequestError.wrap('bad', cause);
		expect(error.httpStatusCode).toBe(400);
		expect(error.errorCode).toBe(400);
		expect(error.cause).toBe(cause);
	});

	it('InternalServerError should use a default message', () => {
		const error = new InternalServerError();
		expect(error.message).toBe('Internal Server Error');
		expect(error.httpStatusCode).toBe(500);
		expect(error.level).toBe('error');
	});

	it('ServiceUnavailableError should set 503 and level info', () => {
		const error = new ServiceUnavailableError('down');
		expect(error.httpStatusCode).toBe(503);
		expect(error.level).toBe('info');
	});
});
