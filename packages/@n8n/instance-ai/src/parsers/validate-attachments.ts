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

/**
 * Per-file ceiling, in **base64-encoded** bytes. The provider measures an image
 * against its encoded size, not its decoded size — and `AttachmentInfo.data` is
 * base64 (ASCII), so `data.length` is exactly the quantity being limited. Stating
 * this bound in the decoded unit would set it ~4/3 too high and admit payloads the
 * provider rejects.
 *
 * Kept in step with `MAX_ATTACHMENT_BASE64_BYTES` in `@n8n/api-types` (which the
 * request schema and the frontend use) rather than imported from it: this entry
 * point stays dependency-free so lightweight test environments can consume it.
 * A guard test in `packages/cli` asserts the two never drift.
 */
export const MAX_ATTACHMENT_BASE64_BYTES = 10 * 1024 * 1024;

/**
 * Budget for all attachments on a single message. The provider rejects requests
 * over 32 MB in total; half of that leaves room for the system prompt, the
 * replayed thread history, and tool schemas riding in the same request.
 */
export const MAX_TOTAL_ATTACHMENT_BASE64_BYTES = 16 * 1024 * 1024;

/**
 * The per-file ceiling as a raw file size — what a user sees on disk. Enforcement
 * uses the encoded limit above; **copy quotes this**, because telling someone with
 * an 8 MB file that it "exceeds the 10 MB limit" reproduces the very unit confusion
 * this validator exists to prevent.
 */
export const MAX_ATTACHMENT_DECODED_BYTES = (MAX_ATTACHMENT_BASE64_BYTES / 4) * 3;

/** Raw size of a base64 payload, for describing a file the way the user sees it. */
function decodedSize(encodedBytes: number): number {
	return (encodedBytes / 4) * 3;
}

export interface OversizedAttachmentDetail {
	fileName: string;
	encodedBytes: number;
}

/** Which ceiling was hit — callers render different guidance for each. */
export type OversizedAttachmentReason = 'per_file' | 'total';

function formatMegabytes(bytes: number): string {
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Thrown when attachments exceed a size the provider will accept. Carries
 * structured details so HTTP/SSE layers can tell the user which file to shrink
 * rather than failing the whole turn with a generic error.
 */
export class OversizedAttachmentError extends Error {
	readonly reason: OversizedAttachmentReason;

	readonly oversized: OversizedAttachmentDetail[];

	readonly limitBytes: number;

	readonly totalEncodedBytes: number;

	constructor(args: {
		reason: OversizedAttachmentReason;
		oversized: OversizedAttachmentDetail[];
		limitBytes: number;
		totalEncodedBytes: number;
	}) {
		// Sizes are reported decoded so they match the files the user picked.
		super(
			args.reason === 'per_file'
				? `Attachment too large: ${args.oversized
						.map((o) => `${o.fileName} (${formatMegabytes(decodedSize(o.encodedBytes))})`)
						.join(', ')}. Each file must be at most ${formatMegabytes(
						decodedSize(args.limitBytes),
					)}.`
				: `Attachments total ${formatMegabytes(
						decodedSize(args.totalEncodedBytes),
					)}, over the ${formatMegabytes(
						decodedSize(args.limitBytes),
					)} limit for a single message.`,
		);
		this.name = 'OversizedAttachmentError';
		this.reason = args.reason;
		this.oversized = args.oversized;
		this.limitBytes = args.limitBytes;
		this.totalEncodedBytes = args.totalEncodedBytes;
	}
}

/**
 * Validates attachment sizes against what the provider accepts, so an oversized
 * upload fails fast with actionable guidance instead of crashing the LLM call.
 * Checks each file, then the combined payload.
 */
export function validateAttachmentSizes(attachments: AttachmentInfo[]): void {
	const totalEncodedBytes = attachments.reduce((sum, a) => sum + a.data.length, 0);

	const oversized = attachments
		.filter((a) => a.data.length > MAX_ATTACHMENT_BASE64_BYTES)
		.map((a) => ({ fileName: a.fileName, encodedBytes: a.data.length }));

	if (oversized.length > 0) {
		throw new OversizedAttachmentError({
			reason: 'per_file',
			oversized,
			limitBytes: MAX_ATTACHMENT_BASE64_BYTES,
			totalEncodedBytes,
		});
	}

	if (totalEncodedBytes > MAX_TOTAL_ATTACHMENT_BASE64_BYTES) {
		throw new OversizedAttachmentError({
			reason: 'total',
			oversized: [],
			limitBytes: MAX_TOTAL_ATTACHMENT_BASE64_BYTES,
			totalEncodedBytes,
		});
	}
}
