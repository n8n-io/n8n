import { ApplicationError } from '../application.error';

describe('ApplicationError compatibility shim', () => {
	it('keeps the deprecated `ApplicationError` constructor behavior', () => {
		const error = new ApplicationError('boom', {
			tags: { foo: 'bar' },
			extra: { baz: 1 },
		});

		expect(error).toBeInstanceOf(Error);
		expect(error.message).toBe('boom');
		expect(error.level).toBe('error'); // default level
		expect(error.tags).toMatchObject({ foo: 'bar' });
		expect(error.extra).toEqual({ baz: 1 });
	});

	it('honors an explicit level', () => {
		expect(new ApplicationError('x', { level: 'warning' }).level).toBe('warning');
	});
});
