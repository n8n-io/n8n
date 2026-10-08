import { LINKED_INSTANCE_MAX_URL_LENGTH } from '@n8n/api-types';

import {
	accessTokenError,
	checkInstanceAddress,
	isLoopbackHostname,
	linkNameError,
	linkUrlError,
	validateLinkForm,
	type InstanceAddressError,
} from '../linkFormValidation';

// The example table of the server rules (cli linked-instances/__tests__/instance-address.test.ts).
// The form must give the same answer for each address.
describe('checkInstanceAddress', () => {
	describe('accepted addresses', () => {
		it.each<[string, string, boolean]>([
			['acme.app.n8n.cloud', 'https://acme.app.n8n.cloud', false],
			['https://acme.app.n8n.cloud/home/workflows', 'https://acme.app.n8n.cloud', false],
			['http://127.0.0.1:5680/', 'http://127.0.0.1:5680', true],
			['HTTPS://ACME.App.N8N.Cloud/Home', 'https://acme.app.n8n.cloud', false],
			['https://acme.app.n8n.cloud:443/', 'https://acme.app.n8n.cloud', false],
			['https://acme.app.n8n.cloud:80', 'https://acme.app.n8n.cloud:80', false],
			['http://localhost:80/rest', 'http://localhost', true],
			['HTTP://LOCALHOST:5678', 'http://localhost:5678', true],
			['http://[::1]:5680', 'http://[::1]:5680', true],
			['http://[0:0:0:0:0:0:0:1]:5680/x', 'http://[::1]:5680', true],
			['http://127.10.20.30:5678', 'http://127.10.20.30:5678', true],
			['http://127.1:5678', 'http://127.0.0.1:5678', true],
			['localhost:5678/home', 'https://localhost:5678', true],
			['localhost:5678', 'https://localhost:5678', true],
			['acme.app.n8n.cloud:8/home', 'https://acme.app.n8n.cloud:8', false],
			['[fe80::1]:5678', 'https://[fe80::1]:5678', false],
			['192.168.1.10', 'https://192.168.1.10', false],
			['10.0.0.5:5678', 'https://10.0.0.5:5678', false],
			['  acme.app.n8n.cloud \n', 'https://acme.app.n8n.cloud', false],
			['https://acme.app.n8n.cloud/path?query=1#hash', 'https://acme.app.n8n.cloud', false],
			['https://exämple.com', 'https://xn--exmple-cua.com', false],
		])('accepts %j as %s', (input, origin, isLoopback) => {
			expect(checkInstanceAddress(input)).toEqual({ ok: true, origin, isLoopback });
		});
	});

	describe('rejected addresses', () => {
		it.each<[string, InstanceAddressError]>([
			['', 'empty'],
			['   \t\n', 'empty'],
			['acme app.n8n.cloud', 'invalid'],
			['acme.app\n.n8n.cloud', 'invalid'],
			['https://', 'invalid'],
			['https://acme.app.n8n.cloud:99999', 'invalid'],
			['ftp://x', 'unsupported-protocol'],
			['javascript:alert(1)', 'unsupported-protocol'],
			['file:///etc/hosts', 'unsupported-protocol'],
			['ws://acme.app.n8n.cloud', 'unsupported-protocol'],
			['https://user:pw@host', 'has-credentials'],
			['https://user@acme.app.n8n.cloud', 'has-credentials'],
			['http://user:pw@localhost:5678', 'has-credentials'],
			// Without a scheme, the part before the colon is a user name and not a scheme.
			['user:pw@host', 'has-credentials'],
			['user:pw@acme.app.n8n.cloud:5678/home', 'has-credentials'],
			['user:5678@acme.app.n8n.cloud', 'has-credentials'],
			['user@acme.app.n8n.cloud', 'has-credentials'],
			['https://:secret@acme.app.n8n.cloud', 'has-credentials'],
			// An "@" after the path, query or hash does not make the scheme a user name.
			['data:text/plain,a@b', 'unsupported-protocol'],
			['sms:+15550100?body=a@b', 'unsupported-protocol'],
			['tel:+15550100#a@b', 'unsupported-protocol'],
			['http://example.com', 'insecure-http'],
			['http://localhost.example.com', 'insecure-http'],
			['http://127.0.0.1.example.com', 'insecure-http'],
			['http://[::2]:5678', 'insecure-http'],
		])('rejects %j with %s', (input, error) => {
			expect(checkInstanceAddress(input)).toEqual({ ok: false, error });
		});
	});

	describe('length limit', () => {
		const prefix = 'https://acme.app.n8n.cloud/';

		it('accepts an address of exactly the maximum length', () => {
			const address = prefix + 'a'.repeat(LINKED_INSTANCE_MAX_URL_LENGTH - prefix.length);

			expect(address).toHaveLength(LINKED_INSTANCE_MAX_URL_LENGTH);
			expect(checkInstanceAddress(address)).toEqual({
				ok: true,
				origin: 'https://acme.app.n8n.cloud',
				isLoopback: false,
			});
		});

		it('rejects an address one character over the maximum length', () => {
			const address = prefix + 'a'.repeat(LINKED_INSTANCE_MAX_URL_LENGTH - prefix.length + 1);

			expect(checkInstanceAddress(address)).toEqual({ ok: false, error: 'invalid' });
		});

		it('counts the spaces around the address, as the server does', () => {
			const padded = ' '.repeat(LINKED_INSTANCE_MAX_URL_LENGTH) + 'acme.app.n8n.cloud';

			expect(checkInstanceAddress(padded)).toEqual({ ok: false, error: 'invalid' });
		});
	});
});

describe('isLoopbackHostname', () => {
	it.each(['localhost', '127.0.0.1', '127.255.255.255', '[::1]'])(
		'treats %s as loopback',
		(host) => {
			expect(isLoopbackHostname(host)).toBe(true);
		},
	);

	it.each([
		'example.com',
		'128.0.0.1',
		'10.0.0.1',
		'10.127.0.0.1',
		'127.0.0.1.example.com',
		'[::2]',
		'localhost.example.com',
		'::1',
	])('does not treat %s as loopback', (host) => {
		expect(isLoopbackHostname(host)).toBe(false);
	});
});

describe('linkUrlError', () => {
	it.each<[string, string]>([
		['', 'settings.linkedInstances.form.url.empty'],
		['acme app', 'settings.linkedInstances.form.url.invalid'],
		['ftp://acme.app.n8n.cloud', 'settings.linkedInstances.form.url.unsupportedProtocol'],
		['http://acme.app.n8n.cloud', 'settings.linkedInstances.form.url.insecureHttp'],
		['https://u:p@acme.app.n8n.cloud', 'settings.linkedInstances.form.url.hasCredentials'],
	])('maps %j to %s', (input, key) => {
		expect(linkUrlError(input)).toBe(key);
	});

	it('returns no error for an address that the server accepts', () => {
		expect(linkUrlError('https://acme.app.n8n.cloud')).toBeUndefined();
	});
});

describe('linkNameError', () => {
	it.each(['Acme Cloud', 'a', 'Prod (EU) 2.0', 'my_instance-1', 'Zürich Büro', '  Acme  '])(
		'accepts %j',
		(name) => {
			expect(linkNameError(name)).toBeUndefined();
		},
	);

	it('accepts a name of exactly 64 characters', () => {
		expect(linkNameError('a'.repeat(64))).toBeUndefined();
	});

	it.each(['', '   ', '\t\n'])('asks for a name for %j', (name) => {
		expect(linkNameError(name)).toBe('settings.linkedInstances.form.name.required');
	});

	it('says the name is too long at 65 characters', () => {
		expect(linkNameError('a'.repeat(65))).toBe('settings.linkedInstances.form.name.tooLong');
	});

	it('measures the length after trimming, as the server does', () => {
		expect(linkNameError(`  ${'a'.repeat(64)}  `)).toBeUndefined();
	});

	it.each(['<b>Acme</b>', 'Acme/Cloud', 'Acme\nCloud', 'Acme@Cloud', 'Acme "Cloud"'])(
		'rejects the characters in %j',
		(name) => {
			expect(linkNameError(name)).toBe('settings.linkedInstances.form.name.invalid');
		},
	);

	it('reports bad characters, not the length, for a long name with a bad character', () => {
		expect(linkNameError(`${'a'.repeat(10)}<`)).toBe('settings.linkedInstances.form.name.invalid');
	});
});

describe('accessTokenError', () => {
	const token = () => `tok-${crypto.randomUUID()}`;

	it('accepts a token of visible ASCII characters', () => {
		expect(accessTokenError(token())).toBeUndefined();
	});

	it('accepts a token with spaces around it, as the server trims them', () => {
		expect(accessTokenError(`  ${token()}  `)).toBeUndefined();
	});

	it('accepts a token of exactly 4096 characters', () => {
		expect(accessTokenError('x'.repeat(4096))).toBeUndefined();
	});

	it.each(['', '    '])('asks for the token for %j', (value) => {
		expect(accessTokenError(value)).toBe('settings.linkedInstances.form.token.required');
	});

	it('says the token is too long at 4097 characters', () => {
		expect(accessTokenError('x'.repeat(4097))).toBe('settings.linkedInstances.form.token.tooLong');
	});

	it.each(['abc def', 'abcé', 'abc\tdef', 'tök'])('rejects the characters in %j', (value) => {
		expect(accessTokenError(value)).toBe('settings.linkedInstances.form.token.invalid');
	});
});

describe('validateLinkForm', () => {
	const valid = () => ({
		name: 'Acme Cloud',
		url: 'acme.app.n8n.cloud',
		token: `tok-${crypto.randomUUID()}`,
	});

	it('returns no errors for a valid form', () => {
		expect(validateLinkForm(valid())).toEqual({});
	});

	it('returns one error for each invalid field', () => {
		expect(validateLinkForm({ name: '', url: 'http://example.com', token: '' })).toEqual({
			name: 'settings.linkedInstances.form.name.required',
			url: 'settings.linkedInstances.form.url.insecureHttp',
			token: 'settings.linkedInstances.form.token.required',
		});
	});

	it.each(['name', 'url', 'token'] as const)('reports only the %s field when only it fails', (field) => {
		const values = { ...valid(), [field]: '' };

		expect(Object.keys(validateLinkForm(values))).toEqual([field]);
	});
});
