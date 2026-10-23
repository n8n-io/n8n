import { toMailAddressString, toMailString } from '../utils';

describe('toMailString', () => {
	it('should return undefined for null and undefined', () => {
		expect(toMailString(null)).toBeUndefined();
		expect(toMailString(undefined)).toBeUndefined();
	});

	it('should pass strings through unchanged', () => {
		expect(toMailString('to@example.com')).toBe('to@example.com');
		expect(toMailString('a@example.com, b@example.com')).toBe('a@example.com, b@example.com');
		expect(toMailString('')).toBe('');
	});

	it('should stringify primitive non-string values', () => {
		expect(toMailString(42)).toBe('42');
		expect(toMailString(true)).toBe('true');
		expect(toMailString(BigInt(7))).toBe('7');
	});

	it('should JSON-stringify plain objects', () => {
		expect(toMailString({ email: 'a@example.com' })).toBe('{"email":"a@example.com"}');
	});

	it('should JSON-stringify arrays so bodies stay unchanged', () => {
		expect(toMailString([{ id: 1 }, { id: 2 }])).toBe('[{"id":1},{"id":2}]');
		expect(toMailString(['a', 'b'])).toBe('["a","b"]');
	});
});

describe('toMailAddressString', () => {
	it('should behave like toMailString for non-array values', () => {
		expect(toMailAddressString(null)).toBeUndefined();
		expect(toMailAddressString('to@example.com')).toBe('to@example.com');
		expect(toMailAddressString(42)).toBe('42');
	});

	it('should join an array of addresses', () => {
		expect(toMailAddressString(['a@example.com', 'b@example.com'])).toBe(
			'a@example.com, b@example.com',
		);
	});

	it('should join nested arrays of addresses', () => {
		expect(toMailAddressString([['a@example.com', 'b@example.com']])).toBe(
			'a@example.com, b@example.com',
		);
	});

	it('should skip empty and nullish entries when joining an array', () => {
		expect(toMailAddressString(['a@example.com', '', null, undefined, 'b@example.com'])).toBe(
			'a@example.com, b@example.com',
		);
	});

	it('should return an empty string for an empty array', () => {
		expect(toMailAddressString([])).toBe('');
	});
});
