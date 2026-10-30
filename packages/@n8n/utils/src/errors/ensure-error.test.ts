import { ensureError } from './ensure-error';

describe('ensureError', () => {
	it('returns an Error instance unchanged', () => {
		const original = new Error('original error');
		expect(ensureError(original)).toBe(original);
	});

	it('wraps a string in a new Error cause', () => {
		const result = ensureError('something went wrong');
		expect(result).toBeInstanceOf(Error);
		expect(result.cause).toEqual(new Error('something went wrong'));
	});

	it('wraps an object in a new Error cause', () => {
		const obj = { code: 42 };
		const result = ensureError(obj);
		expect(result).toBeInstanceOf(Error);
		expect(result.cause).toEqual(new Error('[object Object]'));
	});

	it('wraps undefined in a new Error cause', () => {
		const result = ensureError(undefined);
		expect(result).toBeInstanceOf(Error);
		expect(result.cause).toEqual(new Error('undefined'));
	});
});
