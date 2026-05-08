import { extractDocxText } from '../docx-parser';
import { MAX_DECODED_SIZE_BYTES } from '../structured-file-parser';

const mockExtractRawText = jest.fn<Promise<{ value: string; messages: unknown[] }>, [unknown]>();

jest.mock('mammoth', () => ({
	__esModule: true,
	default: {
		extractRawText: async (input: { buffer: Buffer }) => await mockExtractRawText(input),
	},
	extractRawText: async (input: { buffer: Buffer }) => await mockExtractRawText(input),
}));

function toBase64(content: string | Buffer): string {
	const buf = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
	return buf.toString('base64');
}

describe('extractDocxText', () => {
	beforeEach(() => {
		mockExtractRawText.mockReset();
	});

	it('returns extracted text from a valid docx', async () => {
		mockExtractRawText.mockResolvedValue({
			value: 'Hello from a docx file.',
			messages: [],
		});

		const result = await extractDocxText({
			data: toBase64('docx-bytes'),
			mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			fileName: 'letter.docx',
		});

		expect(result.text).toBe('Hello from a docx file.');
		expect(result.truncated).toBe(false);
	});

	it('throws when the decoded buffer exceeds the size cap', async () => {
		const huge = Buffer.alloc(MAX_DECODED_SIZE_BYTES + 1, 0x41);
		await expect(
			extractDocxText({
				data: toBase64(huge),
				mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				fileName: 'big.docx',
			}),
		).rejects.toThrow(/exceeds maximum size/);
		expect(mockExtractRawText).not.toHaveBeenCalled();
	});

	it('truncates extracted text beyond MAX_RESULT_CHARS and flags truncated', async () => {
		const longText = 'a'.repeat(50_000);
		mockExtractRawText.mockResolvedValue({ value: longText, messages: [] });

		const result = await extractDocxText({
			data: toBase64('docx-bytes'),
			mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			fileName: 'long.docx',
		});

		expect(result.text.length).toBeLessThanOrEqual(40_000);
		expect(result.truncated).toBe(true);
	});

	it('throws when mammoth produces no text', async () => {
		mockExtractRawText.mockResolvedValue({ value: '   ', messages: [] });

		await expect(
			extractDocxText({
				data: toBase64('docx-bytes'),
				mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				fileName: 'empty.docx',
			}),
		).rejects.toThrow(/no extractable text/);
	});

	it('wraps mammoth errors with a friendly message', async () => {
		mockExtractRawText.mockRejectedValue(new Error('Corrupt file'));

		await expect(
			extractDocxText({
				data: toBase64('not-a-docx'),
				mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				fileName: 'broken.docx',
			}),
		).rejects.toThrow(/Failed to parse docx/);
	});
});
