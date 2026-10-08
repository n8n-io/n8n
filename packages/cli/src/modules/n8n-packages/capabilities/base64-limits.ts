import { BadRequestError } from '@n8n/errors';
import { formatBytes } from '@n8n/utils/number/bytes';

import { PackageExportBlockedError } from '../entities/package-export.errors';

/** The largest package that a caller accepts, and the setting with which an admin changes it. */
export type PackageSizeLimit = {
	maxBytes: number;
	setting: 'N8N_IMPORT_MAX_UNCOMPRESSED_BYTES' | 'N8N_PAYLOAD_SIZE_MAX';
};

/** Space for the JSON-RPC request around the base64 text of a package. */
export const MCP_REQUEST_ENVELOPE_BYTES = 64 * 1024;

const BYTES_PER_MIB = 1024 * 1024;

/**
 * The largest package that one MCP request can carry. Every request body goes through the body
 * parser, which stops at N8N_PAYLOAD_SIZE_MAX (in MiB), so a package that the import limit
 * allows can still be too large to send as base64 text.
 */
export function mcpPackageSizeLimit(
	maxUncompressedBytes: number,
	payloadSizeMaxMiB: number,
): PackageSizeLimit {
	const bodyBytes = Math.floor(payloadSizeMaxMiB * BYTES_PER_MIB) - MCP_REQUEST_ENVELOPE_BYTES;
	// Each 4 characters of base64 carry 3 bytes.
	const bodyLimit = Math.max(0, Math.floor(bodyBytes / 4) * 3);
	if (bodyLimit < maxUncompressedBytes) {
		return { maxBytes: bodyLimit, setting: 'N8N_PAYLOAD_SIZE_MAX' };
	}
	return { maxBytes: maxUncompressedBytes, setting: 'N8N_IMPORT_MAX_UNCOMPRESSED_BYTES' };
}

/** The size limit of a package, in words that tell an admin which setting changes it. */
export function packageSizeLimitMessage({ maxBytes, setting }: PackageSizeLimit): string {
	return `The workflow package is larger than the limit of ${formatBytes(maxBytes)}. An admin can change the limit with ${setting}.`;
}

/** The number of bytes that padded base64 text decodes to, from its length only. */
export function decodedBase64Size(encoded: string): number {
	const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0;
	return Math.floor((encoded.length * 3) / 4) - padding;
}

/**
 * Decodes base64 text of at most `limit.maxBytes` decoded bytes. The size check uses the text
 * length only, so text over the limit is rejected before decoding starts. Strict: the text must
 * be the padded base64 that Node.js writes, because `Buffer.from` ignores characters it cannot
 * decode.
 */
export function decodeBase64WithinLimit(encoded: string, limit: PackageSizeLimit): Buffer {
	if (decodedBase64Size(encoded) > limit.maxBytes) {
		throw new BadRequestError(packageSizeLimitMessage(limit));
	}
	const decoded = Buffer.from(encoded, 'base64');
	// A regular expression for this check overflows the stack for text of a few megabytes.
	if (decoded.toString('base64') !== encoded) {
		throw new BadRequestError(
			'packageBase64 is not valid base64. Pass the packageBase64 value of export_workflow_package unchanged.',
		);
	}
	return decoded;
}

/**
 * Reads a whole stream into one buffer, but stops at `limit.maxBytes`. The stream is destroyed
 * when it goes over the limit, so the producer stops writing.
 */
export async function collectWithinLimit(
	source: AsyncIterable<Uint8Array>,
	limit: PackageSizeLimit,
): Promise<Buffer> {
	const chunks: Uint8Array[] = [];
	let total = 0;
	// Leaving the loop with an error makes the stream iterator destroy the stream.
	for await (const chunk of source) {
		total += chunk.byteLength;
		if (total > limit.maxBytes) {
			throw new PackageExportBlockedError(packageSizeLimitMessage(limit));
		}
		chunks.push(chunk);
	}
	return Buffer.concat(chunks, total);
}
