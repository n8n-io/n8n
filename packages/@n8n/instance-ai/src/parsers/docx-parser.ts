import { assertOoxmlWithinBounds } from './ooxml-guard';
import {
	MAX_DECODED_SIZE_BYTES,
	formatSizeLimitMessage,
	paginateTextContent,
	type AttachmentInfo,
	type TextPaginationOptions,
} from './structured-file-parser';

export interface DocxExtractionResult {
	text: string;
	truncated: boolean;
	totalChars: number;
	nextStartChar?: number;
}

/**
 * Extracts plain text from a `.docx` (Office Open XML) attachment using `mammoth`.
 */
export async function extractDocxText(
	attachment: AttachmentInfo,
	options?: TextPaginationOptions,
): Promise<DocxExtractionResult> {
	const decoded = Buffer.from(attachment.data, 'base64');
	if (decoded.length > MAX_DECODED_SIZE_BYTES) {
		throw new Error(formatSizeLimitMessage(decoded.length));
	}
	assertOoxmlWithinBounds(decoded, attachment.fileName);

	const mammoth = await import('mammoth');
	const extractRawText = mammoth.extractRawText ?? mammoth.default?.extractRawText;
	if (typeof extractRawText !== 'function') {
		throw new Error('mammoth.extractRawText is not available');
	}

	let raw: { value: string };
	try {
		raw = await extractRawText({ buffer: decoded });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'unknown error';
		throw new Error(`Failed to parse docx "${attachment.fileName}": ${message}`);
	}

	const text = raw.value?.trim() ?? '';
	if (!text) {
		throw new Error(`docx "${attachment.fileName}" contains no extractable text.`);
	}

	const page = paginateTextContent(text, options);
	return {
		text: page.content,
		truncated: page.truncated,
		totalChars: page.totalChars,
		...(page.nextStartChar !== undefined ? { nextStartChar: page.nextStartChar } : {}),
	};
}
