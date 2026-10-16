import { stripNonXHeaders } from '../strip-non-x-headers';

describe('stripNonXHeaders', () => {
	it('removes non-x headers and preserves x-prefixed headers', () => {
		const error = {
			headers: {
				authorization: 'secret',
				'x-request-id': 'request-id',
				'X-Request-Id': 'mixed-case',
			},
		};

		stripNonXHeaders(error);

		expect(error.headers).toEqual({
			'x-request-id': 'request-id',
			'X-Request-Id': 'mixed-case',
		});
	});

	it('does nothing when headers are absent', () => {
		const error = new Error('failed');

		stripNonXHeaders(error);

		expect(error).toEqual(new Error('failed'));
	});
});
