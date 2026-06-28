import { gzipSync, gunzipSync } from 'node:zlib';

const GZIP_PREFIX = 'gzip:base64:';

/**
 * Compresses a string payload using Gzip and returns it in a prefixed base64 format.
 * If the payload is empty, null, or undefined, it is returned as is.
 */
export function compressPayload(data: string): string;
export function compressPayload(data: string | null): string | null;
export function compressPayload(data: string | undefined): string | undefined;
export function compressPayload(data: string | null | undefined): string | null | undefined {
	if (!data) return data;
	try {
		const compressed = gzipSync(Buffer.from(data, 'utf8'));
		return GZIP_PREFIX + compressed.toString('base64');
	} catch (error) {
		// Fallback to uncompressed if compression fails
		return data;
	}
}

/**
 * Decompresses a payload if it is prefixed with the gzip indicator.
 * If it is not prefixed, returns the input payload as is (for backward compatibility).
 */
export function decompressPayload(data: string): string;
export function decompressPayload(data: string | null): string | null;
export function decompressPayload(data: string | undefined): string | undefined;
export function decompressPayload(data: string | null | undefined): string | null | undefined {
	if (!data) return data;
	if (data.startsWith(GZIP_PREFIX)) {
		try {
			const base64Data = data.substring(GZIP_PREFIX.length);
			const decompressed = gunzipSync(Buffer.from(base64Data, 'base64'));
			return decompressed.toString('utf8');
		} catch (error) {
			// If decompression fails, we log it or fallback (it should not happen unless corrupted)
			return data;
		}
	}
	return data;
}
