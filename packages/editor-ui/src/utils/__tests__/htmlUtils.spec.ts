import { ALLOWED_HTML_TAGS } from '@/constants';
import { sanitizeHtml } from '../htmlUtils';

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
});
