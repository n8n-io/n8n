import { readPastedResourcePath, toAbsoluteUrl, toInstanceRelativePath } from './resourceUrl';

const root = { origin: 'https://n8n.example.com', basePath: '' };
const subPath = { origin: 'https://n8n.example.com', basePath: '/n8n' };

describe('toInstanceRelativePath', () => {
	it.each([
		['https://n8n.example.com/workflow/abc123', root, '/workflow/abc123'],
		['  https://n8n.example.com/workflow/abc123\n', root, '/workflow/abc123'],
		['https://n8n.example.com/workflow/abc?tab=1#node', root, '/workflow/abc?tab=1#node'],
		['https://n8n.example.com/n8n/workflow/abc123', subPath, '/workflow/abc123'],
		['https://n8n.example.com/n8n', subPath, '/'],
		['https://n8n.example.com/n8n/page/p1', { ...subPath, basePath: '/n8n/' }, '/page/p1'],
		['/projects/p1/datatables/dt1', subPath, '/projects/p1/datatables/dt1'],
	])('converts %s', (text, instance, expected) => {
		expect(toInstanceRelativePath(text, instance)).toBe(expected);
	});

	it.each([
		['a URL of another origin', 'https://other.example.com/workflow/abc123', root],
		['a URL of another port', 'https://n8n.example.com:8443/workflow/abc123', root],
		['a URL outside the base path', 'https://n8n.example.com/workflow/abc123', subPath],
		['a path that only starts like the base path', 'https://n8n.example.com/n8nx/page/p1', subPath],
		['a protocol-relative URL', '//other.example.com/workflow/abc123', root],
		['a sentence that starts with a slash', '/workflow/abc is slow', root],
		['plain text', 'hello world', root],
	])('returns undefined for %s', (_case, text, instance) => {
		expect(toInstanceRelativePath(text, instance)).toBeUndefined();
	});
});

describe('readPastedResourcePath', () => {
	it('reads the path of a resource of this instance', () => {
		expect(readPastedResourcePath('https://n8n.example.com/n8n/workflow/abc123', subPath)).toBe(
			'/workflow/abc123',
		);
	});

	it('ignores an address of this instance that opens no resource', () => {
		expect(readPastedResourcePath('https://n8n.example.com/settings/users', root)).toBeUndefined();
	});

	it('ignores an address of another instance', () => {
		expect(
			readPastedResourcePath('https://other.example.com/workflow/abc123', root),
		).toBeUndefined();
	});
});

describe('toAbsoluteUrl', () => {
	it('adds the origin and the base path', () => {
		expect(toAbsoluteUrl('/page/p1', root)).toBe('https://n8n.example.com/page/p1');
		expect(toAbsoluteUrl('/page/p1', subPath)).toBe('https://n8n.example.com/n8n/page/p1');
		expect(toAbsoluteUrl('/page/p1', { ...subPath, basePath: '/n8n/' })).toBe(
			'https://n8n.example.com/n8n/page/p1',
		);
	});
});
