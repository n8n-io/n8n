import { escapeHtml } from '../escape-html';

describe('escapeHtml', () => {
	it('should escape HTML tags', () => {
		expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
	});

	it('should escape ampersands', () => {
		expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
	});

	it('should escape double quotes', () => {
		expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
	});

	it('should escape single quotes', () => {
		expect(escapeHtml("it's")).toBe('it&#x27;s');
	});

	it('should escape template-syntax payloads', () => {
		expect(escapeHtml('{{constructor.constructor("return this")()}}')).toBe(
			'{{constructor.constructor(&quot;return this&quot;)()}}',
		);
	});

	it('should handle null and undefined', () => {
		expect(escapeHtml(null)).toBe('');
		expect(escapeHtml(undefined)).toBe('');
	});

	it('should convert non-string values to strings', () => {
		expect(escapeHtml(42)).toBe('42');
		expect(escapeHtml(true)).toBe('true');
	});
});
