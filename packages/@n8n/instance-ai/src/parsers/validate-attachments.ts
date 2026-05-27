import type { AttachmentInfo } from './structured-file-parser';

/**
 * Every concrete MIME type our parsers can extract content from.
 * Keep in sync with `MIME_TO_FORMAT` in structured-file-parser.ts.
 */
const PARSEABLE_MIME_TYPES: readonly string[] = [
	// Tabular
	'text/csv',
	'application/csv',
	'text/tab-separated-values',
	'application/json',
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	// Text-like (extracted to plain text/markdown)
	'text/plain',
	'text/markdown',
	'text/x-markdown',
	'text/html',
	'application/xhtml+xml',
	'application/pdf',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * Wildcard patterns we accept in addition to PARSEABLE_MIME_TYPES — used by
 * vision-capable LLMs which can ingest image bytes directly without a parser.
 */
const SUPPORTED_WILDCARD_PATTERNS: readonly string[] = ['image/*'];

/** MIME types our parsers can produce text/rows from. */
export function getParseableAttachmentMimeTypes(): string[] {
	return [...PARSEABLE_MIME_TYPES];
}

/**
 * Every MIME type instance-ai accepts on input — parseable formats plus
 * provider-supported multimodal types like `image/*`.
 */
export function getSupportedAttachmentMimeTypes(): string[] {
	return [...PARSEABLE_MIME_TYPES, ...SUPPORTED_WILDCARD_PATTERNS];
}

export function isSupportedAttachmentMimeType(mimeType: string): boolean {
	if (PARSEABLE_MIME_TYPES.includes(mimeType)) return true;
	for (const pattern of SUPPORTED_WILDCARD_PATTERNS) {
		if (pattern.endsWith('/*')) {
			const prefix = pattern.slice(0, -1); // "image/"
			if (mimeType.startsWith(prefix)) return true;
		}
	}
	return false;
}

export interface UnsupportedAttachmentDetail {
	fileName: string;
	mimeType: string;
}

/**
 * Thrown when at least one attachment uses a MIME type we can't ingest.
 * Carries structured details so HTTP/SSE layers can surface a typed error to the client.
 */
export class UnsupportedAttachmentError extends Error {
	readonly unsupported: UnsupportedAttachmentDetail[];

	readonly supported: string[];

	constructor(unsupported: UnsupportedAttachmentDetail[]) {
		const summary = unsupported.map((u) => `${u.fileName} (${u.mimeType})`).join(', ');
		super(`Unsupported attachment type: ${summary}`);
		this.name = 'UnsupportedAttachmentError';
		this.unsupported = unsupported;
		this.supported = getSupportedAttachmentMimeTypes();
	}
}

/**
 * Validates every attachment's MIME type. Throws `UnsupportedAttachmentError`
 * with details for every offending attachment if any are unsupported.
 */
export function validateAttachmentMimeTypes(attachments: AttachmentInfo[]): void {
	const unsupported = attachments
		.filter((a) => !isSupportedAttachmentMimeType(a.mimeType))
		.map((a) => ({ fileName: a.fileName, mimeType: a.mimeType }));

	if (unsupported.length > 0) {
		throw new UnsupportedAttachmentError(unsupported);
	}
}
