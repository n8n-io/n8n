export type BinaryFileKind = 'image' | 'audio' | 'pdf';

export interface BinaryFileType {
	kind: BinaryFileKind;
	mimeType: string;
}

/**
 * Identify a binary file by inspecting its magic bytes.
 *
 * Returns the detected kind/mimeType for file formats that current LLM
 * providers (Anthropic, OpenAI) can consume natively. Returns `null` for any
 * other content — including text — so callers can fall back to text decoding
 * or reject the file.
 */
export function detectBinaryFileType(buffer: Buffer): BinaryFileType | null {
	if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
		return { kind: 'pdf', mimeType: 'application/pdf' };
	}
	if (startsWith(buffer, [0xff, 0xd8, 0xff])) {
		return { kind: 'image', mimeType: 'image/jpeg' };
	}
	if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
		return { kind: 'image', mimeType: 'image/png' };
	}
	if (
		startsWith(buffer, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
		startsWith(buffer, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
	) {
		return { kind: 'image', mimeType: 'image/gif' };
	}
	if (
		startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
		buffer.length >= 12 &&
		buffer.subarray(8, 12).toString('ascii') === 'WEBP'
	) {
		return { kind: 'image', mimeType: 'image/webp' };
	}
	if (
		startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
		buffer.length >= 12 &&
		buffer.subarray(8, 12).toString('ascii') === 'WAVE'
	) {
		return { kind: 'audio', mimeType: 'audio/wav' };
	}
	if (startsWith(buffer, [0x49, 0x44, 0x33])) {
		return { kind: 'audio', mimeType: 'audio/mpeg' };
	}
	if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
		return { kind: 'audio', mimeType: 'audio/mpeg' };
	}
	return null;
}

function startsWith(buffer: Buffer, prefix: number[]): boolean {
	if (buffer.length < prefix.length) return false;
	for (let i = 0; i < prefix.length; i++) {
		if (buffer[i] !== prefix[i]) return false;
	}
	return true;
}
