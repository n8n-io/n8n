import { UnsupportedMediaTypeError } from '@n8n/errors';

import { assertContentType } from '../content-type';

describe('assertContentType', () => {
	it('returns true for a matching media type', () => {
		expect(assertContentType('application/json', 'application/json', true)).toBe(true);
	});

	it('ignores parameters and casing when matching', () => {
		expect(assertContentType('Application/JSON; charset=utf-8', 'application/json', true)).toBe(
			true,
		);
	});

	it('throws naming the reported media type for a mismatch', () => {
		expect(() => assertContentType('text/plain', 'application/json', true)).toThrow(
			UnsupportedMediaTypeError,
		);
		expect(() => assertContentType('text/plain', 'application/json', true)).toThrow(
			'unsupported media type text/plain',
		);
	});

	it('reports a missing media type as the literal undefined', () => {
		expect(() => assertContentType(undefined, 'application/json', true)).toThrow(
			'unsupported media type undefined',
		);
	});

	it('returns false without throwing for a missing header when the body is optional', () => {
		expect(assertContentType(undefined, 'application/json', false)).toBe(false);
	});

	it('returns false without throwing for a whitespace-only header when the body is optional', () => {
		expect(assertContentType(' ', 'multipart/form-data', false)).toBe(false);
	});

	it('still throws for a mismatched media type when the body is optional', () => {
		expect(() => assertContentType('text/plain', 'multipart/form-data', false)).toThrow(
			UnsupportedMediaTypeError,
		);
	});
});
