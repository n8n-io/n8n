import {
	MAX_DECODED_SIZE_BYTES,
	MAX_RESULT_CHARS,
	formatSizeLimitMessage,
	type AttachmentInfo,
} from './structured-file-parser';

export interface DocxExtractionResult {
	text: string;
	truncated: boolean;
}

/**
 * Extracts plain text from a `.docx` (Office Open XML) attachment using `mammoth`.
 */
export async function extractDocxText(attachment: AttachmentInfo): Promise<DocxExtractionResult> {
	const decoded = Buffer.from(attachment.data, 'base64');
	if (decoded.length > MAX_DECODED_SIZE_BYTES) {
		throw new Error(formatSizeLimitMessage(decoded.length));
	}

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

	if (text.length > MAX_RESULT_CHARS) {
		return { text: text.slice(0, MAX_RESULT_CHARS), truncated: true };
	}
	return { text, truncated: false };
}
