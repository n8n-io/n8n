import { UnsupportedMediaTypeError } from '@n8n/errors';

import { assertContentType } from '../content-type';

describe('assertContentType', () => {
	it('returns true for a matching media type', () => {
		expect(
			assertContentType({
				header: 'application/json',
				expected: 'application/json',
				bodyRequired: true,
			}),
		).toBe(true);
	});

	it('ignores parameters and casing when matching', () => {
		expect(
			assertContentType({
				header: 'Application/JSON; charset=utf-8',
				expected: 'application/json',
				bodyRequired: true,
			}),
		).toBe(true);
	});

	it('throws naming the reported media type for a mismatch', () => {
		try {
			assertContentType({ header: 'text/plain', expected: 'application/json', bodyRequired: true });
		} catch (error) {
			expect(error).toBeInstanceOf(UnsupportedMediaTypeError);
			expect(error).toHaveProperty('message', 'unsupported media type text/plain');
		}
	});

	it('reports a missing media type as the literal undefined', () => {
		expect(() =>
			assertContentType({ header: undefined, expected: 'application/json', bodyRequired: true }),
		).toThrow('unsupported media type undefined');
	});

	it('returns false without throwing for a missing header when the body is optional', () => {
		expect(
			assertContentType({ header: undefined, expected: 'application/json', bodyRequired: false }),
		).toBe(false);
	});

	it('returns false without throwing for a whitespace-only header when the body is optional', () => {
		expect(
			assertContentType({ header: ' ', expected: 'multipart/form-data', bodyRequired: false }),
		).toBe(false);
	});

	it('still throws for a mismatched media type when the body is optional', () => {
		expect(() =>
			assertContentType({
				header: 'text/plain',
				expected: 'multipart/form-data',
				bodyRequired: false,
			}),
		).toThrow(UnsupportedMediaTypeError);
	});
});
