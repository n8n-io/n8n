import { extractUrl } from './extract-url';

describe('extractUrl', () => {
	it.each([
		['a url: https://example.net/ and an email: test@example.org', 'https://example.net/'],
		[
			'Check this out: https://subdomain.example.com:3000/path?q=1#hash',
			'https://subdomain.example.com:3000/path?q=1#hash',
		],
		['Mixed: https://www.example.com. and http://www.example.org', 'https://www.example.com'],
		['Localhost URL: http://localhost:8080/test?x=1;', 'http://localhost:8080/test?x=1'],
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
		['Docs: https://docs.n8n.io.', 'https://docs.n8n.io'],
		['Visit https://example.com, then come back', 'https://example.com'],
		['File at https://example.com/data.csv;', 'https://example.com/data.csv'],
		['The link is this: https://example.com/a: it works', 'https://example.com/a'],
		['Search https://example.com/search?q=n8n!', 'https://example.com/search?q=n8n'],
		['Did you see https://example.com/page?', 'https://example.com/page'],
		['More at https://example.com/docs...', 'https://example.com/docs'],
	])('leaves out the sentence punctuation after the URL in %j', (text, url) => {
		expect(extractUrl(text)).toBe(url);
	});

	it.each([
		'https://example.com/',
		'https://example.com/a.b,c;d:e!f',
		'https://example.com/?time=12:30',
		'https://en.wikipedia.org/wiki/C_(programming_language)',
		"https://en.wikipedia.org/wiki/Kids'_Choice_Awards",
		'https://example.com/?q="n8n"',
		'https://example.com/a>',
		'https://example.com/a)',
	])('keeps all other characters of %j', (url) => {
		expect(extractUrl(`Go to ${url} now`)).toBe(url);
	});
});
