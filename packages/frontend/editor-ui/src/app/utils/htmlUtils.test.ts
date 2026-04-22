import { ALLOWED_HTML_TAGS } from '@/app/constants';
import { sanitizeHtml } from './htmlUtils';

describe('sanitizeHtml', () => {
	test.each(ALLOWED_HTML_TAGS)('should allow allowed HTML tag %s', (tag) => {
		const dirtyHtml = `<${tag}>This is allowed.</${tag}>`;
		const result = sanitizeHtml(dirtyHtml);
		expect(result).toBe(`<${tag}>This is allowed.</${tag}>`);
	});

	test('should remove disallowed script tag', () => {
		const dirtyHtml = '<script>alert("hello")</script>';
		const result = sanitizeHtml(dirtyHtml);
		expect(result).toBe('alert("hello")');
	});

	test('should remove disallowed img tag', () => {
		const dirtyHtml = '<img src="https://n8n.io/logo.png">';
		const result = sanitizeHtml(dirtyHtml);
		expect(result).toBe('');
	});

	test('should allow specific attributes', () => {
		const dirtyHtml = '<a href="https://example.com" title="example">Link</a>';
		const result = sanitizeHtml(dirtyHtml);
		expect(result).toBe('<a href="https://example.com" title="example">Link</a>');
	});

	test('should remove disallowed attributes', () => {
		const dirtyHtml = '<a href="https://example.com" onclick="alert(\'click\')">Link</a>';
		const result = sanitizeHtml(dirtyHtml);
		expect(result).toBe('<a href="https://example.com">Link</a>');
	});

	test('should sanitize href with disallowed protocols', () => {
		const dirtyHtml = '<a href="javascript:alert(\'XSS\')">Click me</a>';
		const result = sanitizeHtml(dirtyHtml);
		expect(result).toBe('<a>Click me</a>');
	});

	test('should strip href with multiline value', () => {
		const dirtyHtml = '<a href="javascript:alert(1);//\r\nhttps://x.com">Click</a>';
		expect(sanitizeHtml(dirtyHtml)).toBe('<a>Click</a>');
	});

	test('should strip href with embedded newline', () => {
		const dirtyHtml = '<a href="javascript:void(0);//\nhttps://example.com">Click</a>';
		expect(sanitizeHtml(dirtyHtml)).toBe('<a>Click</a>');
	});

	test('should allow valid https href', () => {
		const dirtyHtml = '<a href="https://example.com">Link</a>';
		expect(sanitizeHtml(dirtyHtml)).toBe('<a href="https://example.com">Link</a>');
	});

	test('should allow valid http href', () => {
		const dirtyHtml = '<a href="http://example.com">Link</a>';
		expect(sanitizeHtml(dirtyHtml)).toBe('<a href="http://example.com">Link</a>');
	});

	test('should allow relative href', () => {
		const dirtyHtml = '<a href="/path/to/page">Link</a>';
		expect(sanitizeHtml(dirtyHtml)).toBe('<a href="/path/to/page">Link</a>');
	});

	test('should strip data: URI href', () => {
		const dirtyHtml = '<a href="data:text/html,<script>alert(1)</script>">Click</a>';
		expect(sanitizeHtml(dirtyHtml)).toBe('<a>Click</a>');
	});

	test.each([
		[
			'https://www.ex.com/sfefdfd<img/src/onerror=alert(1)>fdf/xdfef.json',
			'https://www.ex.com/sfefdfdfdf/xdfef.json',
		],
		[
			// eslint-disable-next-line n8n-local-rules/no-unneeded-backticks
			`https://www.ex.com/sfefdfd<details title='"><img/src/onerror=alert(document.domain)>/ '>/c.json`,
			'https://www.ex.com/sfefdfd<details title="&quot;&gt;&lt;img/src/onerror=alert(document.domain)&gt;/">/c.json',
		],
	])('should escape js code %s to equal %s', (dirtyURL, expected) => {
		expect(sanitizeHtml(dirtyURL)).toBe(expected);
	});
});
