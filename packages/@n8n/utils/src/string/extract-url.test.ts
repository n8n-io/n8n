import { extractUrl } from './extract-url';

describe('extractUrl', () => {
	it.each([
		['a url: https://example.net/ and an email: test@example.org', 'https://example.net/'],
		[
			'Check this out: https://subdomain.example.com:3000/path?q=1#hash',
			'https://subdomain.example.com:3000/path?q=1#hash',
		],
		['Mixed: https://www.example.com. and http://www.example.org', 'https://www.example.com.'],
		['Localhost URL: http://localhost:8080/test?x=1;', 'http://localhost:8080/test?x=1;'],
	])('gives the first URL in %j', (text, url) => {
		expect(extractUrl(text)).toBe(url);
	});

	it.each([
		'',
		'This is just a simple text',
		'Invalid URL: http:///example.com',
		'example.com',
		'Invalid URL: htt6://example.io',
	])('gives no value for %j, which has no full URL', (text) => {
		expect(extractUrl(text)).toBeUndefined();
	});

	it.each([
		['See (https://example.com) for details', 'https://example.com'],
		['(More at https://example.com/docs)', 'https://example.com/docs'],
		['((https://example.com/a))', 'https://example.com/a'],
		['(see https://example.com/docs).', 'https://example.com/docs'],
		['[n8n](https://n8n.io)**bold**', 'https://n8n.io'],
		[
			'(see https://en.wikipedia.org/wiki/Rust_(language))',
			'https://en.wikipedia.org/wiki/Rust_(language)',
		],
	])('stops at a closing parenthesis that the URL does not open in %j', (text, url) => {
		expect(extractUrl(text)).toBe(url);
	});

	it.each([
		['Go to <https://example.com/a> now', 'https://example.com/a'],
		['Go to "https://example.com/a" now', 'https://example.com/a'],
		['<a href="https://example.com/a">link</a>', 'https://example.com/a'],
		['{"url":"https://example.com/a","id":1}', 'https://example.com/a'],
	])('stops at a character that delimits the URL in %j', (text, url) => {
		expect(extractUrl(text)).toBe(url);
	});

	it.each([
		'https://example.com/',
		'https://example.com/a.b,c;d:e!f',
		'https://example.com/?time=12:30',
		'https://en.wikipedia.org/wiki/C_(programming_language)',
		"https://en.wikipedia.org/wiki/Kids'_Choice_Awards",
		'https://en.wikipedia.org/wiki/Washington,_D.C.',
		'https://example.com/page?',
		'https://example.com/a;',
	])('keeps all characters of %j', (url) => {
		expect(extractUrl(`Go to ${url} now`)).toBe(url);
	});

	describe('examples from RFC 3986', () => {
		it.each([
			'ftp://ftp.is.co.za/rfc/rfc1808.txt',
			'http://www.ietf.org/rfc/rfc2396.txt',
			'http://192.0.2.16:80/',
			'http://example.com:8042/over/there?name=ferret#nose',
			'HTTP://www.EXAMPLE.com/',
			'http://example.com',
			'http://example.com:/',
			'http://example.com/?',
			'http://example.com/%7Bfoo%7D',
			'ftp://cnn.example.com&story=breaking_news@10.0.0.1/top_story.htm',
			'http://www.ics.uci.edu/pub/ietf/uri/#Related',
			// All characters that the `pchar`, `query` and `fragment` rules permit
			"http://example.com/a-._~!$&'()*+,;=:@/b?c/?d#e/?f",
		])('keeps all characters of %j', (url) => {
			expect(extractUrl(url)).toBe(url);
		});

		// Appendix C: delimiters around a URL in a text
		it.each([
			[
				'Yes, Jim, I found it under "http://www.w3.org/Addressing/",',
				'http://www.w3.org/Addressing/',
			],
			['pick it up from <ftp://foo.example.com/rfc/>.  Note', 'ftp://foo.example.com/rfc/'],
			[
				'the warning in <http://www.ics.uci.edu/pub/ietf/uri/historical.html#WARNING>.',
				'http://www.ics.uci.edu/pub/ietf/uri/historical.html#WARNING',
			],
			['<URL:http://www.ietf.org/rfc/rfc2396.txt>', 'http://www.ietf.org/rfc/rfc2396.txt'],
			['For example, "http://localhost/" is', 'http://localhost/'],
		])('gives the URL without its delimiters in %j', (text, url) => {
			expect(extractUrl(text)).toBe(url);
		});
	});
});
