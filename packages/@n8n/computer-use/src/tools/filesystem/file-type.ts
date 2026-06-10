import { lookup } from 'mime-types';

export type SupportedBinaryKind = 'image' | 'pdf';

export interface SupportedBinaryFile {
	kind: SupportedBinaryKind;
	mimeType: string;
}

/**
 * IANA media types (as returned by `mime-types.lookup()`) that Claude can
 * consume natively. Audio is intentionally excluded — Anthropic's API does
 * not accept audio content, so passing it through would surface a provider
 * error to the user.
 */
const SUPPORTED_BINARY_MIMES = new Map<string, SupportedBinaryKind>([
	['image/jpeg', 'image'],
	['image/png', 'image'],
	['image/gif', 'image'],
	['image/webp', 'image'],
	['application/pdf', 'pdf'],
]);

/**
 * Identify a file's binary kind from its path (extension-based via the
 * `mime-types` package). Returns `null` when the extension is unknown or maps
 * to a MIME type no supported model can consume natively — the caller should
 * fall back to text reading in that case.
 */
export function detectSupportedBinaryFile(filePath: string): SupportedBinaryFile | null {
	const mimeType = lookup(filePath);
	if (!mimeType) return null;
	const kind = SUPPORTED_BINARY_MIMES.get(mimeType);
	if (!kind) return null;
	return { kind, mimeType };
}
