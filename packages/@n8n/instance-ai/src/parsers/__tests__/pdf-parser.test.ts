import { extractPdfText } from '../pdf-parser';
import { MAX_DECODED_SIZE_BYTES } from '../structured-file-parser';

const mockGetText = jest.fn<Promise<{ text: string; total: number }>, []>();
const mockDestroy = jest.fn<Promise<void>, []>();

jest.mock('pdf-parse', () => ({
	__esModule: true,
	PDFParse: jest.fn().mockImplementation(() => ({
		getText: mockGetText,
		destroy: mockDestroy,
	})),
}));

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

	it('truncates extracted text beyond MAX_RESULT_CHARS and flags truncated', async () => {
		const longText = 'a'.repeat(50_000);
		mockGetText.mockResolvedValue({
			text: longText,
			total: 99,
		});

		const result = await extractPdfText({
			data: toBase64('pdf-bytes'),
			mimeType: 'application/pdf',
			fileName: 'long.pdf',
		});

		expect(result.text.length).toBeLessThanOrEqual(40_000);
		expect(result.truncated).toBe(true);
		expect(result.pages).toBe(99);
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
});
