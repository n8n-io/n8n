import { mayReachDirectory, normalize } from '../request-path';

describe('normalize', () => {
	it.each([
		['leaves an already canonical path unchanged', '/types/nodes.json', '/types/nodes.json'],
		['collapses a run of slashes', '/types///nodes.json', '/types/nodes.json'],
		['collapses a leading double slash', '//types/nodes.json', '/types/nodes.json'],
		['decodes an encoded slash', '/types%2Fnodes.json', '/types/nodes.json'],
		['decodes an encoded letter', '/types/%6Eodes.json', '/types/nodes.json'],
		['decodes only once', '/types/%252fnodes.json', '/types/%2fnodes.json'],
		['keeps a malformed percent sequence', '/types/%zz', '/types/%zz'],
		['resolves a single dot segment', '/types/./nodes.json', '/types/nodes.json'],
		['resolves a double dot segment', '/types/x/../nodes.json', '/types/nodes.json'],
		['resolves an encoded double dot segment', '/types/x/%2e%2e/nodes.json', '/types/nodes.json'],
		['drops a double dot climbing above the root', '/../../etc/passwd', '/etc/passwd'],
		['lower-cases the result', '/TYPES/Nodes.JSON', '/types/nodes.json'],
		['treats a backslash as a separator', '\\types\\nodes.json', '/types/nodes.json'],
		['returns the root unchanged', '/', '/'],
		['strips a trailing slash', '/types/', '/types'],
		['prefixes a path without a leading slash', 'types/nodes.json', '/types/nodes.json'],
		['returns the root for an empty input', '', '/'],
		['trims trailing dots from a directory segment', '/types../nodes.json', '/types/nodes.json'],
		[
			'trims a trailing space from a directory segment',
			'/types%20/nodes.json',
			'/types/nodes.json',
		],
		['trims a trailing dot from a file segment', '/types/nodes.json.', '/types/nodes.json'],
		['drops a segment of a single space', '/types/%20/nodes.json', '/types/nodes.json'],
		['drops a segment made only of dots', '/types/.../nodes.json', '/types/nodes.json'],
		[
			'resolves a space-suffixed double dot segment',
			'/foo/..%20/assets/main.js',
			'/assets/main.js',
		],
		['resolves a space-suffixed single dot segment', '/types/.%20/nodes.json', '/types/nodes.json'],
		[
			'drops a space-suffixed segment of three dots',
			'/types/x/...%20/nodes.json',
			'/types/x/nodes.json',
		],
		[
			'drops a segment made only of dots and spaces',
			'/types/.%20.%20/nodes.json',
			'/types/nodes.json',
		],
		['returns the root for a path made only of such segments', '/.../%20%20/', '/'],
	])('%s', (_title, input, expected) => {
		expect(normalize(input)).toBe(expected);
	});
});

describe('mayReachDirectory', () => {
	it.each([
		['the directory itself', '/types'],
		['a file in the directory', '/types/nodes.json'],
		['a mixed-case form', '/TYPES/Nodes.JSON'],
		['an encoded separator', '/types%2Fnodes.json'],
		['a repeated separator', '/types//nodes.json'],
		['a backslash separator', '\\types\\nodes.json'],
		['a dot segment resolving into the directory', '/types/x/../nodes.json'],
		['a trailing dot on the directory segment', '/types./nodes.json'],
		['a trailing space on the directory segment', '/types%20/nodes.json'],
		['a malformed percent sequence anywhere in the path', '/foo/%zz/bar'],
	])('reports %s as reaching the directory', (_title, requestPath) => {
		expect(mayReachDirectory(requestPath, 'types')).toBe(true);
	});

	it('reports a match against a mixed-case directory argument', () => {
		expect(mayReachDirectory('/types/nodes.json', 'Types')).toBe(true);
	});

	it.each([
		['a space-suffixed double dot', '/foo/..%20/types/nodes.json'],
		['a dot-suffixed double dot', '/foo/..%20./types/nodes.json'],
		['a space-suffixed double dot inside the directory', '/types/foo/..%20/nodes.json'],
		['a space-suffixed single dot', '/foo/.%20/types/nodes.json'],
		['a three-dot segment', '/foo/...%20/types/nodes.json'],
		['an unreadable segment with the directory trailing a dot', '/foo/..%20/types./nodes.json'],
		['a space-suffixed double dot climbing out of the directory', '/types/..%20/nodes.json'],
	])('reports %s as reaching the directory', (_title, requestPath) => {
		expect(mayReachDirectory(requestPath, 'types')).toBe(true);
	});

	it.each([
		['an unrelated path', '/public-asset.txt'],
		['a path sharing the prefix', '/types-extra.txt'],
		['the directory nested under another route', '/rest/credential-resolvers/types'],
		['an unreadable segment without the directory', '/foo/..%20/bar/nodes.json'],
		['a dot segment climbing back out of the directory', '/types/../foo/nodes.json'],
	])('reports %s as not reaching the directory', (_title, requestPath) => {
		expect(mayReachDirectory(requestPath, 'types')).toBe(false);
	});
});
