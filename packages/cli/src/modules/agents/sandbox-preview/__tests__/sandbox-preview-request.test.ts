import fc from 'fast-check';

import {
	hasDotDotSegment,
	isDocumentRequest,
	parsePreviewUrl,
	segmentClimbsOut,
} from '../sandbox-preview-request';

const TOKEN = 'header.payload.signature';

/** Segments that every decoder leaves as they are and that never name a parent directory. */
const safeSegmentArb = fc
	.string({
		unit: fc.constantFrom(...'abcXYZ019-_.~'.split('')),
		minLength: 1,
		maxLength: 12,
	})
	.filter((segment) => segment !== '..');

/** `..` written with any mix of raw, encoded and double-encoded dots. */
const encodedDotArb = fc.constantFrom('.', '%2e', '%2E', '%252e', '%252E', '%25252e');
const dotDotArb = fc.tuple(encodedDotArb, encodedDotArb).map(([first, second]) => first + second);

/** A separator that a decoder or a Windows-style path turns into a segment break. */
const separatorArb = fc.constantFrom('%2f', '%2F', '%5c', '%5C', '\\', '%252f');

/** A segment that holds `..` on its own or between separators, as the client sends it. */
const climbingSegmentArb = fc.oneof(
	dotDotArb,
	fc.tuple(safeSegmentArb, separatorArb, dotDotArb).map((parts) => parts.join('')),
	fc.tuple(dotDotArb, separatorArb, safeSegmentArb).map((parts) => parts.join('')),
);

/** Text that decodes once to a malformed escape (`%zz`, a lone `%`), which strict decoders refuse. */
const badAfterDecodeArb = fc.constantFrom('%25zz', '%25', '%25g1', '%25%25', 'x%25zz');

/** A climbing segment with an escape that a decode makes malformed, before or after the `..`. */
const noisyClimbingSegmentArb = fc
	.tuple(badAfterDecodeArb, separatorArb, dotDotArb, fc.boolean())
	.map(([noise, separator, dotDot, noiseFirst]) =>
		noiseFirst ? `${noise}${separator}${dotDot}` : `${dotDot}${separator}${noise}`,
	);

const queryArb = fc.oneof(
	fc.constant(''),
	fc.webQueryParameters().map((query) => `?${query}`),
	fc.constant('?next=../../sandboxes/other/exec'),
);

describe('parsePreviewUrl', () => {
	it.each(['', '/', '/?x=1', '//src/main.ts'])('finds no token in %j', (url) => {
		expect(parsePreviewUrl(url)).toEqual({ kind: 'no-token' });
	});

	it('keeps the query of a URL that ends at the token', () => {
		expect(parsePreviewUrl(`/${TOKEN}`)).toEqual({ kind: 'token-only', token: TOKEN, search: '' });
		expect(parsePreviewUrl(`/${TOKEN}?x=1&y=2`)).toEqual({
			kind: 'token-only',
			token: TOKEN,
			search: '?x=1&y=2',
		});
	});

	it.each([
		['/', '/'],
		['/src/main.ts?t=1', '/src/main.ts?t=1'],
		['/src/./main.ts', '/src/./main.ts'],
		['/a//b', '/a//b'],
		['/files/100%25', '/files/100%25'],
		['/a%2Fb', '/a%2Fb'],
		['/.../..foo/foo..', '/.../..foo/foo..'],
		['/src?next=../../x', '/src?next=../../x'],
		['/%252525', '/%252525'],
		['/img/100%25.png', '/img/100%25.png'],
		['/a%25zz/b', '/a%25zz/b'],
		['/caf%C3%A9/menu', '/caf%C3%A9/menu'],
	])('forwards %s after the token as %s', (suffix, forwardPath) => {
		expect(parsePreviewUrl(`/${TOKEN}${suffix}`)).toEqual({
			kind: 'forward',
			token: TOKEN,
			forwardPath,
		});
	});

	it.each([
		'/../../sandboxes/other/exec',
		'/src/..%2F..%2Fsandboxes/other/exec',
		'/%2e%2e/%2e%2e/sandboxes/other/exec',
		'/%2E%2E/x',
		'/.%2e/x',
		'/%2e./x',
		'/src/.%2e/..',
		'/..%5cx',
		'/a\\..\\b',
		'/%252e%252e/x',
		'/%25252e%25252e/x',
		'/%zz',
		'/%2525252525',
		'/%252e%252e%252fx%25zz',
		'/a%25zz%252f..%252fb',
		'/%25zz%5c%252e%252e',
	])('refuses %s after the token', (suffix) => {
		expect(parsePreviewUrl(`/${TOKEN}${suffix}`)).toEqual({ kind: 'invalid' });
	});

	it.each(['/..', '/../rest/login', '/%2e%2e/rest', '/%zz/x'])(
		'refuses %s in the token position',
		(url) => {
			expect(parsePreviewUrl(url)).toEqual({ kind: 'invalid' });
		},
	);

	it('forwards any path of safe segments unchanged, with its query', () => {
		fc.assert(
			fc.property(fc.array(safeSegmentArb, { maxLength: 6 }), queryArb, (segments, query) => {
				const suffix = `/${segments.join('/')}${query}`;

				expect(parsePreviewUrl(`/${TOKEN}${suffix}`)).toEqual({
					kind: 'forward',
					token: TOKEN,
					forwardPath: suffix,
				});
			}),
		);
	});

	it('refuses any path with a `..` segment, wherever it is and however it is encoded', () => {
		fc.assert(
			fc.property(
				fc.array(safeSegmentArb, { maxLength: 4 }),
				climbingSegmentArb,
				fc.array(safeSegmentArb, { maxLength: 4 }),
				queryArb,
				(before, climbing, after, query) => {
					const path = ['', TOKEN, ...before, climbing, ...after].join('/');

					expect(parsePreviewUrl(`${path}${query}`)).toEqual({ kind: 'invalid' });
				},
			),
		);
	});
});

describe('parsePreviewUrl with escapes that a decode makes malformed', () => {
	it('refuses a `..` segment that only a lenient second decode reveals', () => {
		fc.assert(
			fc.property(
				fc.array(safeSegmentArb, { maxLength: 3 }),
				noisyClimbingSegmentArb,
				fc.array(safeSegmentArb, { maxLength: 3 }),
				(before, climbing, after) => {
					const path = ['', TOKEN, ...before, climbing, ...after].join('/');

					expect(parsePreviewUrl(path)).toEqual({ kind: 'invalid' });
				},
			),
		);
	});
});

describe('segmentClimbsOut', () => {
	it.each([
		'..',
		'%2e%2e',
		'a%2f..',
		'..%5cb',
		'%252e%252e',
		'%zz',
		'%252e%252e%252fx%25zz',
		'a%25zz%252f..%252fb',
		'%25zz%252f%252e%252e',
	])(
		'is true for %s',
		(segment) => {
			expect(segmentClimbsOut(segment)).toBe(true);
		},
	);

	it.each(['', '.', '...', 'a..b', '100%25', '%252525', 'main.ts', 'a%25zz', '100%25.png', '%25%2e'])(
		'is false for %j',
		(segment) => {
			expect(segmentClimbsOut(segment)).toBe(false);
		},
	);

	it('keeps checking after a decode leaves a malformed escape', () => {
		// Round two of `%252e%252e%252f%25zz` is `%2e%2e%2f%zz`, which `decodeURIComponent` refuses.
		expect(segmentClimbsOut('%252e%252e%252f%25zz')).toBe(true);
		expect(segmentClimbsOut('%252e%252e%25zz')).toBe(false);
	});

	it('decodes a run of escapes as UTF-8 bytes in later rounds', () => {
		// `%25C3%25A9` decodes to `%C3%A9` and then to `é`; no round names a parent.
		expect(segmentClimbsOut('%25C3%25A9%25zz')).toBe(false);
	});

	it('refuses a segment that still decodes after four rounds', () => {
		expect(segmentClimbsOut('%25252525')).toBe(true);
		expect(segmentClimbsOut('%252525')).toBe(false);
	});
});

describe('hasDotDotSegment', () => {
	it('is true when one segment of many climbs out', () => {
		expect(hasDotDotSegment(['src', 'main.ts', '%2e%2e'])).toBe(true);
	});

	it('is false for no segments or only safe ones', () => {
		expect(hasDotDotSegment([])).toBe(false);
		expect(hasDotDotSegment(['src', 'main.ts'])).toBe(false);
	});
});

describe('isDocumentRequest', () => {
	it.each([
		['GET', { accept: 'text/html,application/xhtml+xml' }],
		['GET', { 'sec-fetch-dest': 'document' }],
		['GET', { 'sec-fetch-dest': 'iframe', accept: '*/*' }],
		['HEAD', { accept: 'text/html' }],
		['POST', { accept: 'text/html', 'sec-fetch-dest': 'document' }],
		['POST', { 'sec-fetch-dest': 'iframe' }],
	])('is true for %s %j', (method, headers) => {
		expect(isDocumentRequest(method, headers)).toBe(true);
	});

	it.each([
		['GET', { accept: '*/*' }],
		['GET', { 'sec-fetch-dest': 'script', accept: '*/*' }],
		['GET', {}],
		['POST', { accept: 'text/html' }],
		['POST', { accept: 'text/html', 'sec-fetch-dest': 'empty' }],
		['PUT', { accept: 'text/html,application/xhtml+xml' }],
		[undefined, { accept: 'text/html' }],
	])('is false for %s %j', (method, headers) => {
		expect(isDocumentRequest(method, headers)).toBe(false);
	});
});
