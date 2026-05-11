import {
	MAX_DECODED_SIZE_BYTES,
	MAX_RESULT_CHARS,
	formatSizeLimitMessage,
	type AttachmentInfo,
} from './structured-file-parser';

export interface PdfExtractionResult {
	text: string;
	pages: number;
	truncated: boolean;
}

/**
 * Extracts plain text from a PDF attachment using `pdf-parse`.
 *
 * Lazy-imported so the module is only loaded the first time a PDF is parsed.
 */
export async function extractPdfText(attachment: AttachmentInfo): Promise<PdfExtractionResult> {
	const decoded = Buffer.from(attachment.data, 'base64');
	if (decoded.length > MAX_DECODED_SIZE_BYTES) {
		throw new Error(formatSizeLimitMessage(decoded.length));
	}

	const { PDFParse } = await import('pdf-parse');

	const parser = new PDFParse({ data: decoded });
	let extractedText: string;
	let totalPages: number;
	try {
		const result = await parser.getText();
		extractedText = result.text;
		totalPages = result.total;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'unknown error';
		throw new Error(`Failed to parse PDF "${attachment.fileName}": ${message}`);
	} finally {
		await parser.destroy();
	}

	const text = extractedText?.trim() ?? '';
	if (!text) {
		throw new Error(
			`PDF "${attachment.fileName}" contains no extractable text (it may be a scanned image).`,
		);
	}

	if (text.length > MAX_RESULT_CHARS) {
		return {
			text: text.slice(0, MAX_RESULT_CHARS),
			pages: totalPages,
			truncated: true,
		};
	}

	return { text, pages: totalPages, truncated: false };
}
