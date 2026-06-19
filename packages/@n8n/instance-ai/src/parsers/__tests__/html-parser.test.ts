import { extractHtmlContent } from '../html-parser';
import { MAX_DECODED_SIZE_BYTES } from '../structured-file-parser';

function toBase64(content: string): string {
	return Buffer.from(content, 'utf-8').toString('base64');
}

function makeHtmlAttachment(content: string, fileName = 'page.html') {
	return { data: toBase64(content), mimeType: 'text/html', fileName };
}

describe('extractHtmlContent', () => {
	it('extracts visible text from a simple HTML body', async () => {
		const html =
			'<!doctype html><html><head><title>My Page</title></head><body><h1>Heading</h1><p>Hello world.</p></body></html>';
		const result = await extractHtmlContent(makeHtmlAttachment(html));

		expect(result.text).toContain('Heading');
		expect(result.text).toContain('Hello world.');
		expect(result.title).toBe('My Page');
	});

	it('strips script and style tags', async () => {
		const html =
			'<html><body><script>alert("xss")</script><style>body{color:red}</style><p>Visible text</p></body></html>';
		const result = await extractHtmlContent(makeHtmlAttachment(html));

		expect(result.text).toContain('Visible text');
		expect(result.text).not.toContain('alert');
		expect(result.text).not.toContain('color:red');
	});

	it('throws on attachments larger than the size cap', async () => {
		const huge = '<p>' + 'a'.repeat(MAX_DECODED_SIZE_BYTES + 1) + '</p>';
		await expect(extractHtmlContent(makeHtmlAttachment(huge))).rejects.toThrow(
			/exceeds maximum size/,
		);
	});

	it('throws when the HTML has no extractable text', async () => {
		const html = '<html><body></body></html>';
		await expect(extractHtmlContent(makeHtmlAttachment(html))).rejects.toThrow(
			/no extractable text/,
		);
	});

	it('truncates extracted text beyond MAX_RESULT_CHARS and flags truncated', async () => {
		const longParagraph = 'word '.repeat(20_000);
		const html = `<html><body><p>${longParagraph}</p></body></html>`;
		const result = await extractHtmlContent(makeHtmlAttachment(html));

		expect(result.text.length).toBeLessThanOrEqual(40_000);
		expect(result.truncated).toBe(true);
	});

	it('handles XHTML correctly', async () => {
		const xhtml =
			'<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><body><p>hello</p></body></html>';
		const result = await extractHtmlContent({
			data: toBase64(xhtml),
			mimeType: 'application/xhtml+xml',
			fileName: 'page.xhtml',
		});
		expect(result.text).toContain('hello');
	});
});
