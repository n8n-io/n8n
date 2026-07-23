import { createResultError, createResultOk, toResult } from './result';

describe('createResultOk', () => {
	it('produces { ok: true, result: data }', () => {
		expect(createResultOk('hello')).toEqual({ ok: true, result: 'hello' });
	});
});

describe('createResultError', () => {
	it('produces { ok: false, error: e }', () => {
		const testError = new Error('fail');
		expect(createResultError(testError)).toEqual({ ok: false, error: testError });
	});
});

describe('toResult', () => {
	it('returns ok result when function succeeds', () => {
		const result = toResult(() => 42);
		expect(result).toEqual({ ok: true, result: 42 });
	});

	it('returns error result when function throws an Error', () => {
		const testError = new Error('boom');
		const result = toResult(() => {
			throw testError;
		});
		expect(result).toEqual({ ok: false, error: testError });
	});

	it('wraps non-Error throws in an Error', () => {
		const result = toResult(() => {
			// eslint-disable-next-line @typescript-eslint/only-throw-error
			throw 'string error';
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toBeInstanceOf(Error);
			expect(result.error.cause).toBe('string error');
		}
	});
});
