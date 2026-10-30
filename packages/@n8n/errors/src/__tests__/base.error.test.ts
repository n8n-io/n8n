import { BaseError } from '../base.error';

class TestError extends BaseError {}

describe('BaseError', () => {
	it('should have correct defaults', () => {
		const error = new TestError('test');
		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe('TestError');
		expect(error.message).toBe('test');
		expect(error.level).toBe('error');
		expect(error.shouldReport).toBe(true);
		expect(error.description).toBeUndefined();
	});

	it.each([
		['fatal', true],
		['error', true],
		['warning', false],
		['info', false],
	] as const)('should derive shouldReport from level %s', (level, shouldReport) => {
		expect(new TestError('test', { level }).shouldReport).toBe(shouldReport);
	});

	it('should prefer an explicit shouldReport over the level', () => {
		expect(new TestError('test', { level: 'info', shouldReport: true }).shouldReport).toBe(true);
		expect(new TestError('test', { level: 'error', shouldReport: false }).shouldReport).toBe(false);
	});

	it('should keep description, tags, extra and cause', () => {
		const cause = new Error('root');
		const error = new TestError('test', {
			description: 'details',
			tags: { foo: 'bar' },
			extra: { baz: 1 },
			cause,
		});

		expect(error.description).toBe('details');
		expect(error.tags).toMatchObject({ foo: 'bar' });
		expect(error.extra).toEqual({ baz: 1 });
		expect(error.cause).toBe(cause);
	});
});
