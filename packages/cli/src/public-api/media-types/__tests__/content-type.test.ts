import { UnsupportedMediaTypeError } from '@n8n/errors';

import { assertContentType } from '../content-type';

describe('assertContentType', () => {
	it('ignores parameters and casing when matching', () => {
		expect(
			assertContentType({
				header: 'Application/JSON; charset=utf-8',
				expected: 'application/json',
				bodyRequired: true,
			}),
		).toBe(true);
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
