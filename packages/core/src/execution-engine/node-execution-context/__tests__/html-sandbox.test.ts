import { isHtmlRenderedContentType, sandboxHtmlResponse } from '@/html-sandbox';

describe('sandboxHtmlResponse', () => {
	it('should replace ampersands and double quotes in HTML', () => {
		const html = '<div class="test">Content & more</div>';
		expect(sandboxHtmlResponse(html)).toMatchSnapshot();
	});

	it('should handle empty HTML', () => {
		const html = '';
		expect(sandboxHtmlResponse(html)).toMatchSnapshot();
	});

	it('should handle HTML with special characters', () => {
		const html = '<p>Special characters: <>&"\'</p>';
		expect(sandboxHtmlResponse(html)).toMatchSnapshot();
	});
});

describe('isHtmlRenderedContentType', () => {
	it('should return true for text/html content type', () => {
		const contentType = 'text/html';
		expect(isHtmlRenderedContentType(contentType)).toBe(true);
	});

	it('should return true for application/xhtml+xml content type', () => {
		const contentType = 'application/xhtml+xml';
		expect(isHtmlRenderedContentType(contentType)).toBe(true);
	});

	it('should return false for other content types', () => {
		const contentType = 'application/json';
		expect(isHtmlRenderedContentType(contentType)).toBe(false);
	});

	describe('should handle various HTML content types', () => {
		test.each([
			'text/html',
			'TEXT/HTML',
			'text/html; charset=utf-8',
			'text/html; charset=iso-8859-1',
			'application/xhtml+xml',
			'APPLICATION/XHTML+XML',
			'application/xhtml+xml; charset=utf-8',
		])('should return true for %s', (contentType) => {
			expect(isHtmlRenderedContentType(contentType)).toBe(true);
		});
	});

	describe('should handle non-HTML content types', () => {
		test.each([
			'text/plain',
			'application/xml',
			'text/css',
			'application/javascript',
			'image/png',
			'application/pdf',
			'',
			'html',
			'xhtml',
		])('should return false for %s', (contentType) => {
			expect(isHtmlRenderedContentType(contentType)).toBe(false);
		});
	});

	it('should handle edge cases', () => {
		expect(isHtmlRenderedContentType('text/htmlsomething')).toBe(true);
		expect(isHtmlRenderedContentType('application/xhtml+xmlsomething')).toBe(true);
		expect(isHtmlRenderedContentType(' text/html')).toBe(false);
		expect(isHtmlRenderedContentType('text/html ')).toBe(true);
	});
});
