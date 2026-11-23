import { escapeXmlAttribute, escapeXmlText } from './escape-xml';

describe('escapeXmlText', () => {
	it('should escape ampersand, less-than and greater-than', () => {
		expect(escapeXmlText('&')).toBe('&amp;');
		expect(escapeXmlText('<')).toBe('&lt;');
		expect(escapeXmlText('>')).toBe('&gt;');
		expect(escapeXmlText('</a> & <b>')).toBe('&lt;/a&gt; &amp; &lt;b&gt;');
	});

	it('should not escape quotes', () => {
		expect(escapeXmlText('"it\'s"')).toBe('"it\'s"');
	});

	it('should escape the ampersand of an already escaped entity', () => {
		expect(escapeXmlText('&amp;')).toBe('&amp;amp;');
	});

	it('should return text with nothing to escape unchanged', () => {
		expect(escapeXmlText('plain text 123')).toBe('plain text 123');
	});
});

describe('escapeXmlAttribute', () => {
	it('should escape ampersand, double quote, less-than and greater-than', () => {
		expect(escapeXmlAttribute('&')).toBe('&amp;');
		expect(escapeXmlAttribute('"')).toBe('&quot;');
		expect(escapeXmlAttribute('<')).toBe('&lt;');
		expect(escapeXmlAttribute('>')).toBe('&gt;');
		expect(escapeXmlAttribute('a" b="<c> & d')).toBe('a&quot; b=&quot;&lt;c&gt; &amp; d');
	});

	it('should not escape single quotes', () => {
		expect(escapeXmlAttribute("it's")).toBe("it's");
	});

	it('should escape the ampersand of an already escaped entity', () => {
		expect(escapeXmlAttribute('&amp;')).toBe('&amp;amp;');
	});

	it('should return text with nothing to escape unchanged', () => {
		expect(escapeXmlAttribute('plain text 123')).toBe('plain text 123');
	});
});
