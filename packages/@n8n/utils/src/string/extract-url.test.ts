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
		['Files: ftp://ftp.example.com/pub)', 'ftp://ftp.example.com/pub'],
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
		['Read **https://example.com/docs**', 'https://example.com/docs'],
		['More at https://example.com/docs...', 'https://example.com/docs'],
		['Download https://example.com/file.pdf.', 'https://example.com/file.pdf'],
		['https://example.com/path.\n\nNext sentence.', 'https://example.com/path'],
	])('leaves out the sentence punctuation after the URL in %j', (text, url) => {
		expect(extractUrl(text)).toBe(url);
	});

	it.each([
		['He said "https://example.com"', 'https://example.com'],
		["He said 'https://example.com/a'", 'https://example.com/a'],
		['He said "https://example.com".', 'https://example.com'],
	])('leaves out the quote after the URL in %j', (text, url) => {
		expect(extractUrl(text)).toBe(url);
	});

	it.each([
		['See (https://example.com) for details', 'https://example.com'],
		['See <https://example.com/a> for details', 'https://example.com/a'],
		[
			'<https://api.github.com/repositories/1/issues?page=2>; rel="next", <https://api.github.com/repositories/1/issues?page=9>; rel="last"',
			'https://api.github.com/repositories/1/issues?page=2',
		],
		['A [link](https://example.com/a) in Markdown', 'https://example.com/a'],
		['(See https://example.com/a.)', 'https://example.com/a'],
		['(See https://example.com/a).', 'https://example.com/a'],
		['Nested ((https://example.com/a))', 'https://example.com/a'],
	])('leaves out the closing bracket of the text around the URL in %j', (text, url) => {
		expect(extractUrl(text)).toBe(url);
	});

	it.each([
		['Wait for https://example.com/#top!?(hello)', 'https://example.com/#top!?(hello)'],
		[
			'https://en.wikipedia.org/wiki/C_(programming_language)',
			'https://en.wikipedia.org/wiki/C_(programming_language)',
		],
		[
			'See https://en.wikipedia.org/wiki/C_(programming_language).',
			'https://en.wikipedia.org/wiki/C_(programming_language)',
		],
		['Wiki (https://example.com/C_(lang))', 'https://example.com/C_(lang)'],
	])('keeps a closing parenthesis that the URL opens in %j', (text, url) => {
		expect(extractUrl(text)).toBe(url);
	});

	it.each([
		'https://example.com/',
		'https://example.com/path/',
		'https://example.com/a.b,c;d:e!f',
		'https://example.com/#section-2',
		'https://example.com/a_b-',
		'https://example.com/list[0]',
		'https://example.com/users/{id}',
		'http://192.168.1.1:8000/path?q=value#frag',
	])('keeps the full URL %j', (url) => {
		expect(extractUrl(`Go to ${url} now`)).toBe(url);
	});

	it.each([
		'https://example.com?q=1',
		'https://example.com/?flag',
		'https://example.com/?empty=',
		'https://example.com/?a=1&b=2&c=3',
		'https://example.com/?a=1&amp;b=2',
		'https://example.com/?q=hello%20world',
		'https://example.com/?q=a+b',
		'https://example.com/?q=100%25',
		'https://example.com/?q=ünïcödé',
		'https://example.com/?email=me@example.com',
		'https://example.com/?time=12:30',
		'https://example.com/?q=a.b,c;d!e',
		'https://example.com/?path=a/b/c/',
		'https://example.com/?token=abc_-~',
		'https://example.com/?ids[]=1&ids[]=2',
		'https://example.com/?filter={"a":1}',
		'https://example.com/?fn=call(1)',
		'https://example.com/?redirect=https://other.example.org/path?x=1',
		'https://example.com/?q=1#frag?x=2',
	])('keeps the full query string of %j', (url) => {
		expect(extractUrl(`Go to ${url} now`)).toBe(url);
	});

	it.each([
		['Is it https://example.com/?a=1&b=2?', 'https://example.com/?a=1&b=2'],
		['Open https://example.com/?ids[]=1&ids[]=2.', 'https://example.com/?ids[]=1&ids[]=2'],
	])('leaves out the punctuation after the query string in %j', (text, url) => {
		expect(extractUrl(text)).toBe(url);
	});

	it.each([
		['https://example.com/?q=hello world', 'https://example.com/?q=hello'],
		['https://example.com/docs/\nsomedirectory/example.pdf', 'https://example.com/docs/'],
		['https://example.com/?a=1\nhttps://example.com/?a=2', 'https://example.com/?a=1'],
	])('stops the URL at the first whitespace in %j', (text, url) => {
		expect(extractUrl(text)).toBe(url);
	});

	// The text does not show if the punctuation is part of the value.
	it.each([
		['https://example.com/?title=Mr.', 'https://example.com/?title=Mr'],
		["https://example.com/?q='n8n'", "https://example.com/?q='n8n"],
		['https://example.com/?q=(a', 'https://example.com/?q=(a'],
	])('cuts the punctuation at the end of a query value in %j', (text, url) => {
		expect(extractUrl(text)).toBe(url);
	});

	it.each([
		['<a href="https://example.com">link</a>', 'https://example.com'],
		["<a href='https://example.com/a?b=1'>link</a>", 'https://example.com/a?b=1'],
		['<p>https://example.com/a</p>', 'https://example.com/a'],
		['Visit https://example.com/a<br>and come back', 'https://example.com/a'],
		['<p>See https://example.com/a.</p>', 'https://example.com/a'],
	])('ends the URL at an HTML tag in %j', (text, url) => {
		expect(extractUrl(text)).toBe(url);
	});

	it.each([
		['{"url":"https://example.com","id":1}', 'https://example.com'],
		['{"url":"https://example.com/a?b=1"}', 'https://example.com/a?b=1'],
		['"https://example.com/a","https://example.org/b"', 'https://example.com/a'],
		["url='https://example.com/a';next='x'", 'https://example.com/a'],
	])('ends a quoted URL at its closing quote in %j', (text, url) => {
		expect(extractUrl(text)).toBe(url);
	});
});
