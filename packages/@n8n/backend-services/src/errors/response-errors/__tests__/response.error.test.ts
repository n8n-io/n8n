import { BadRequestError } from '../bad-request.error';
import { InternalServerError } from '../internal-server.error';
import { NotFoundError } from '../not-found.error';
import { ServiceUnavailableError } from '../service-unavailable.error';

describe('ResponseError', () => {
	it('should set the error level from the HTTP status code', () => {
		expect(new BadRequestError('bad').level).toBe('warning');
		expect(new ServiceUnavailableError('down').level).toBe('info');
		expect(new InternalServerError('boom').level).toBe('error');
	});

	it('should default the error code to the HTTP status code', () => {
		const error = new BadRequestError('bad');

		expect(error.httpStatusCode).toBe(400);
		expect(error.errorCode).toBe(400);
	});

	it('should keep the cause', () => {
		const cause = new Error('root');

		expect(BadRequestError.wrap('bad', cause).cause).toBe(cause);
	});

	it('should assert a defined value', () => {
		expect(() => NotFoundError.isDefinedAndNotNull(null, 'missing')).toThrow(NotFoundError);
		expect(() => NotFoundError.isDefinedAndNotNull('x', 'missing')).not.toThrow();
	});
});
