import { lookup } from 'mime-types';

export type BinaryFileKind = 'image' | 'audio' | 'pdf';

export interface BinaryFileType {
	kind: BinaryFileKind;
	mimeType: string;
}

/**
 * IANA media types (as returned by `mime-types.lookup()`) that current LLM
 * providers (Anthropic, OpenAI) can consume natively.
 */
const SUPPORTED_BINARY_MIMES = new Map<string, BinaryFileKind>([
	['image/jpeg', 'image'],
	['image/png', 'image'],
	['image/gif', 'image'],
	['image/webp', 'image'],
	['audio/mpeg', 'audio'],
	['audio/wav', 'audio'],
	['audio/x-wav', 'audio'],
	['application/pdf', 'pdf'],
]);

/**
 * Identify a file's binary kind from its path (extension-based via the
 * `mime-types` package). Returns `null` when the extension is unknown or maps
 * to a MIME type no supported model can consume natively — the caller should
 * fall back to text reading in that case.
 */
export function detectBinaryFileType(filePath: string): BinaryFileType | null {
	const mimeType = lookup(filePath);
	if (!mimeType) return null;
	const kind = SUPPORTED_BINARY_MIMES.get(mimeType);
	if (!kind) return null;
	return { kind, mimeType };
}
