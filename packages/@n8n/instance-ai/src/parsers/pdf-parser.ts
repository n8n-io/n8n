import {
	MAX_DECODED_SIZE_BYTES,
	formatSizeLimitMessage,
	paginateTextContent,
	type AttachmentInfo,
	type TextPaginationOptions,
} from './structured-file-parser';

export interface PdfExtractionResult {
	text: string;
	pages: number;
	truncated: boolean;
	totalChars: number;
	nextStartChar?: number;
}

/**
 * Extracts plain text from a PDF attachment using `pdf-parse`.
 *
 * Lazy-imported so the module is only loaded the first time a PDF is parsed.
 */
export async function extractPdfText(
	attachment: AttachmentInfo,
	options?: TextPaginationOptions,
): Promise<PdfExtractionResult> {
	const decoded = Buffer.from(attachment.data, 'base64');
	if (decoded.length > MAX_DECODED_SIZE_BYTES) {
		throw new Error(formatSizeLimitMessage(decoded.length));
	}

	// pdf-parse v2 is backed by pdfjs-dist, which expects a `DOMMatrix` global
	// that Node.js does not provide. Polyfill it before parsing.
	if (typeof Reflect.get(globalThis, 'DOMMatrix') === 'undefined') {
		const { default: DOMMatrix } = await import('@thednp/dommatrix');
		Reflect.set(globalThis, 'DOMMatrix', DOMMatrix);
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

	const page = paginateTextContent(text, options);
	return {
		text: page.content,
		pages: totalPages,
		truncated: page.truncated,
		totalChars: page.totalChars,
		...(page.nextStartChar !== undefined ? { nextStartChar: page.nextStartChar } : {}),
	};
}
