import { extractPdfText } from '../pdf-parser';
import { MAX_DECODED_SIZE_BYTES } from '../structured-file-parser';

const { mockGetText, mockDestroy } = vi.hoisted(() => ({
	mockGetText: vi.fn<() => Promise<{ text: string; total: number }>>(),
	mockDestroy: vi.fn<() => Promise<void>>(),
}));

vi.mock('pdf-parse', () => {
	class PDFParse {
		getText = mockGetText;
		destroy = mockDestroy;
	}
	return { PDFParse };
});

function toBase64(content: string | Buffer): string {
	const buf = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
	return buf.toString('base64');
}

describe('extractPdfText', () => {
	beforeEach(() => {
		mockGetText.mockReset();
		mockDestroy.mockReset().mockResolvedValue(undefined);
	});

	it('returns extracted text and page count for a small PDF', async () => {
		mockGetText.mockResolvedValue({
			text: 'Hello world',
			total: 1,
		});

		const result = await extractPdfText({
			data: toBase64('pdf-bytes'),
			mimeType: 'application/pdf',
			fileName: 'doc.pdf',
		});

		expect(result.text).toBe('Hello world');
		expect(result.pages).toBe(1);
		expect(result.truncated).toBe(false);
		expect(mockDestroy).toHaveBeenCalledTimes(1);
	});

	it('throws when the decoded buffer exceeds the size cap', async () => {
		const huge = Buffer.alloc(MAX_DECODED_SIZE_BYTES + 1, 0x41);
		await expect(
			extractPdfText({
				data: toBase64(huge),
				mimeType: 'application/pdf',
				fileName: 'big.pdf',
			}),
		).rejects.toThrow(/exceeds maximum size/);
		expect(mockGetText).not.toHaveBeenCalled();
	});

	it('truncates extracted text beyond MAX_RESULT_CHARS and paginates with startChar', async () => {
		const longText = `${'a'.repeat(40_000)}${'b'.repeat(10_000)}`;
		mockGetText.mockResolvedValue({
			text: longText,
			total: 99,
		});

		const attachment = {
			data: toBase64('pdf-bytes'),
			mimeType: 'application/pdf',
			fileName: 'long.pdf',
		};
		const first = await extractPdfText(attachment);

		expect(first.text.length).toBe(40_000);
		expect(first.truncated).toBe(true);
		expect(first.totalChars).toBe(50_000);
		expect(first.nextStartChar).toBe(40_000);
		expect(first.pages).toBe(99);

		const second = await extractPdfText(attachment, { startChar: first.nextStartChar });
		expect(second.text).toBe('b'.repeat(10_000));
		expect(second.truncated).toBe(false);
		expect(second.nextStartChar).toBeUndefined();
	});

	it('wraps pdf-parse errors with a friendly message', async () => {
		mockGetText.mockRejectedValue(new Error('Invalid PDF structure'));

		await expect(
			extractPdfText({
				data: toBase64('not-a-pdf'),
				mimeType: 'application/pdf',
				fileName: 'broken.pdf',
			}),
		).rejects.toThrow(/Failed to parse PDF/);
		expect(mockDestroy).toHaveBeenCalledTimes(1);
	});

	it('throws on empty extracted text', async () => {
		mockGetText.mockResolvedValue({ text: '', total: 0 });

		await expect(
			extractPdfText({
				data: toBase64('pdf-bytes'),
				mimeType: 'application/pdf',
				fileName: 'empty.pdf',
			}),
		).rejects.toThrow(/no extractable text/);
	});

	// `pdf-parse` v2 is backed by pdfjs-dist, which references the `DOMMatrix`
	// global. Node.js does not provide it, so the parser must polyfill it before
	// parsing — otherwise pdfjs throws "DOMMatrix is not defined" on PDFs that
	// exercise that code path.
	describe('DOMMatrix polyfill', () => {
		const hadDomMatrix = 'DOMMatrix' in globalThis;
		const originalDomMatrix: unknown = Reflect.get(globalThis, 'DOMMatrix');

		afterAll(() => {
			if (hadDomMatrix) {
				Reflect.set(globalThis, 'DOMMatrix', originalDomMatrix);
			} else {
				Reflect.deleteProperty(globalThis, 'DOMMatrix');
			}
		});

		it('defines a usable DOMMatrix global before parsing when one is absent', async () => {
			Reflect.deleteProperty(globalThis, 'DOMMatrix');
			mockGetText.mockResolvedValue({ text: 'Hello world', total: 1 });

			await extractPdfText({
				data: toBase64('pdf-bytes'),
				mimeType: 'application/pdf',
				fileName: 'doc.pdf',
			});

			expect(typeof Reflect.get(globalThis, 'DOMMatrix')).toBe('function');
		});
	});
});
