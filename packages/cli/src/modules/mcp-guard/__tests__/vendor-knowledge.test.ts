import {
	loadVendorKnowledge,
	matchesVendor,
	parseVendorFile,
	isTokenExchange,
	vendorForRequest,
} from '../vendor-knowledge';

const FILE = `---
name: demo
hosts: api.demo.test, API.Demo.test.
path_prefixes: /v1
passthrough_hosts: auth.demo.test
read_paths:
- ^/v1/search$
- ^/v1/list\\..*$
graphql_paths:
- ^/v1/graphql$
---
Instructions for the demo vendor.
Second line.
`;

describe('parseVendorFile', () => {
	it('reads the front block and the instructions', () => {
		const vendor = parseVendorFile(FILE, 'demo.md');

		expect(vendor.name).toBe('demo');
		expect(vendor.hosts).toEqual(['api.demo.test']);
		expect(vendor.pathPrefixes).toEqual(['/v1']);
		expect(vendor.passthroughHosts).toEqual(['auth.demo.test']);
		expect(vendor.graphqlPaths).toHaveLength(1);
		expect(vendor.graphqlPaths[0].test('/v1/graphql')).toBe(true);
		expect(vendor.readPaths).toHaveLength(2);
		expect(vendor.readPaths[0].test('/v1/search')).toBe(true);
		expect(vendor.readPaths[1].test('/v1/list.all')).toBe(true);
		expect(vendor.readPaths[1].test('/v1/listing')).toBe(false);
		expect(vendor.instructions).toBe('Instructions for the demo vendor.\nSecond line.');
	});

	it.each([
		['no front block', 'just text'],
		['no name', '---\nhosts: a.test\n---\nx'],
		['no hosts', '---\nname: a\n---\nx'],
		['an empty body', '---\nname: a\nhosts: a.test\n---\n'],
	])('throws for %s', (_label, text) => {
		expect(() => parseVendorFile(text, 'bad.md')).toThrow(/bad\.md/);
	});

	it('throws for a read path that is not a valid pattern', () => {
		expect(() =>
			parseVendorFile('---\nname: a\nhosts: a.test\nread_paths:\n- (\n---\nx', 'bad.md'),
		).toThrow(/bad\.md/);
	});
});

describe('matchesVendor', () => {
	const vendor = parseVendorFile(FILE, 'demo.md');

	it('matches the host in any case, with or without a trailing dot, and the path prefix', () => {
		expect(matchesVendor(vendor, 'API.demo.test.', '/v1/x')).toBe(true);
		expect(matchesVendor(vendor, 'api.demo.test', '/v1')).toBe(true);
	});

	it('does not match another host or another path', () => {
		expect(matchesVendor(vendor, 'other.test', '/v1/x')).toBe(false);
		expect(matchesVendor(vendor, 'api.demo.test', '/v2/x')).toBe(false);
		expect(matchesVendor(vendor, 'api.demo.test', '/v1x')).toBe(false);
	});
});

describe('matchesVendor with a `*` in a path prefix', () => {
	const vendor = parseVendorFile(
		'---\nname: tok\nhosts: api.tok.test\npath_prefixes: /bot*, /file/bot*\n---\nx',
		'tok.md',
	);

	it('matches a segment that has text where the `*` is', () => {
		expect(matchesVendor(vendor, 'api.tok.test', '/bot123:AAH-x/sendMessage')).toBe(true);
		expect(matchesVendor(vendor, 'api.tok.test', '/bot123:AAH-x')).toBe(true);
		expect(matchesVendor(vendor, 'api.tok.test', '/file/bot123:AAH-x/photos/a.jpg')).toBe(true);
	});

	it('does not match a segment without text for the `*`, or another path', () => {
		expect(matchesVendor(vendor, 'api.tok.test', '/bot/sendMessage')).toBe(false);
		expect(matchesVendor(vendor, 'api.tok.test', '/other/bot123:AA/x')).toBe(false);
		expect(matchesVendor(vendor, 'api.tok.test', '/file/other')).toBe(false);
	});

	it('treats a dot in a prefix as a plain dot', () => {
		const dotted = parseVendorFile(
			'---\nname: d\nhosts: a.test\npath_prefixes: /v1.0/x*\n---\nx',
			'd.md',
		);

		expect(matchesVendor(dotted, 'a.test', '/v1.0/xa/y')).toBe(true);
		expect(matchesVendor(dotted, 'a.test', '/v1a0/xa/y')).toBe(false);
	});
});

describe('the Gmail vendor file', () => {
	it('loads and names the Gmail API of www.googleapis.com and gmail.googleapis.com', () => {
		const gmail = loadVendorKnowledge('gmail');

		expect(gmail.name).toBe('gmail');
		expect(gmail.hosts).toEqual(
			expect.arrayContaining(['www.googleapis.com', 'gmail.googleapis.com']),
		);
		expect(gmail.passthroughHosts).toContain('oauth2.googleapis.com');
		expect(gmail.instructions).toContain('native');
	});

	it('is chosen for a Gmail request and not for another Google API', () => {
		expect(vendorForRequest('www.googleapis.com', '/gmail/v1/users/me/messages')?.name).toBe(
			'gmail',
		);
		expect(vendorForRequest('gmail.googleapis.com', '/gmail/v1/users/me/labels')?.name).toBe(
			'gmail',
		);
		expect(vendorForRequest('www.googleapis.com', '/drive/v3/files')).toBeUndefined();
		expect(vendorForRequest('example.com', '/gmail/v1/users/me/messages')).toBeUndefined();
	});

	it('treats only a POST to a token path of a sign-in host as a token exchange', () => {
		const call = (method: string, path: string, host = 'oauth2.googleapis.com') => ({
			method,
			url: new URL(`https://${host}${path}`),
		});
		expect(isTokenExchange(call('POST', '/token'))).toBe(true);
		expect(isTokenExchange(call('POST', '/revoke'))).toBe(false);
		expect(isTokenExchange(call('GET', '/token'))).toBe(false);
		expect(isTokenExchange(call('POST', '/token', 'example.com'))).toBe(false);
		expect(
			isTokenExchange({ method: 'POST', url: new URL('http://oauth2.googleapis.com/token') }),
		).toBe(false);
	});
});
