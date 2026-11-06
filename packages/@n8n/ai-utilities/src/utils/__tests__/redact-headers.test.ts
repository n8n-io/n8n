import { redactHeaderValues } from '../redact-headers';

describe('redactHeaderValues', () => {
	it('masks built-in and caller-supplied headers in header containers', () => {
		const options = {
			headers: {
				Authorization: 'Bearer secret',
				'X-Custom-Secret': 'secret',
				Accept: 'application/json',
			},
			nested: {
				defaultHeaders: { Cookie: 'session=secret' },
			},
		};

		expect(redactHeaderValues(options, ['x-custom-secret'])).toEqual({
			headers: {
				Authorization: '**********',
				'X-Custom-Secret': '**********',
				Accept: 'application/json',
			},
			nested: {
				defaultHeaders: { Cookie: '**********' },
			},
		});
	});

	it('leaves matching keys outside header containers unchanged', () => {
		const options = { authorization: 'not a header container' };

		expect(redactHeaderValues(options, [])).toBe(options);
	});
});
