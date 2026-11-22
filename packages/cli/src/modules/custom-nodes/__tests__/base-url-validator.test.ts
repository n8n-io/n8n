import { UserError } from '@n8n/errors';

import { validateBaseUrl } from '../base-url-validator';

describe('validateBaseUrl', () => {
	it.each(['https://api.acme.test', 'http://localhost:8080/v1', 'https://api.acme.test/v2/'])(
		'accepts %s',
		(url) => {
			expect(() => validateBaseUrl(url)).not.toThrow();
		},
	);

	it.each([
		['a value that is not a URL', 'not a url'],
		['an ftp URL', 'ftp://files.acme.test'],
		['a file URL', 'file:///etc/hosts'],
		['an expression', 'https://{{ $env.HOST }}/api'],
		['a value that starts with =', '=https://api.acme.test'],
		['a backslash', 'https://api.acme.test\\v1'],
		['a line break', 'https://api.acme.test/v1\n'],
		['a tab', 'https://api.acme.test/\tv1'],
		['a null character', 'https://api.acme.test/\u0000'],
		['a delete character', 'https://api.acme.test/\u007f'],
		['user information', 'https://user:pw@api.acme.test/v1'],
		['a user name', 'https://user@api.acme.test'],
		['a query string', 'https://api.acme.test/v1?key=1'],
		['an empty query string', 'https://api.acme.test/v1?'],
	])('rejects %s', (_, url) => {
		expect(() => validateBaseUrl(url)).toThrow(UserError);
	});
});
