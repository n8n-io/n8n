/**
 * Decompression-bomb guard for OOXML attachments (`.docx`, `.xlsx`, …), which are
 * ZIP containers. The compressed payload is already capped (MAX_DECODED_SIZE_BYTES),
 * but a small archive can still inflate to many gigabytes and OOM the instance.
 *
 * `mammoth` / SheetJS parse synchronously, so a wall-clock timeout can't interrupt
 * them on the main thread. Instead we read the ZIP central directory (cheap — no
 * inflation) and reject up front when the declared uncompressed size or entry count
 * exceeds a sane bound.
 */

const EOCD_SIGNATURE = 0x06054b50; // "PK\x05\x06"
const CENTRAL_FILE_HEADER_SIGNATURE = 0x02014b50; // "PK\x01\x02"
const EOCD_MIN_SIZE = 22;
const CENTRAL_FILE_HEADER_MIN_SIZE = 46;
const MAX_EOCD_COMMENT = 0xffff;
const ZIP64_SIZE_MARKER = 0xffffffff;

/** Total declared uncompressed size across all entries (200 MB). */
export const MAX_OOXML_UNCOMPRESSED_BYTES = 200 * 1024 * 1024;
/** Max number of entries in the archive. */
export const MAX_OOXML_ENTRIES = 1024;

function formatMB(bytes: number): string {
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Reads the ZIP central directory of `buffer` and throws when the archive declares
 * more than `MAX_OOXML_UNCOMPRESSED_BYTES` of uncompressed data or more than
 * `MAX_OOXML_ENTRIES` entries. A buffer without a readable central directory is
 * left untouched — it isn't a valid OOXML archive and the downstream parser will
 * reject it (the compressed size is already bounded).
 */
export function assertOoxmlWithinBounds(buffer: Buffer, fileName: string): void {
	const eocd = findEndOfCentralDirectory(buffer);
	if (eocd === undefined) return;

	const entryCount = buffer.readUInt16LE(eocd + 10);
	if (entryCount > MAX_OOXML_ENTRIES) {
		throw new Error(
			`"${fileName}" has too many archive entries (${entryCount} > ${MAX_OOXML_ENTRIES}); refusing to parse a potential decompression bomb.`,
		);
	}

	let offset = buffer.readUInt32LE(eocd + 16);
	let totalUncompressed = 0;
	for (let i = 0; i < entryCount; i++) {
		if (offset + CENTRAL_FILE_HEADER_MIN_SIZE > buffer.length) break;
		if (buffer.readUInt32LE(offset) !== CENTRAL_FILE_HEADER_SIGNATURE) break;

		const uncompressed = buffer.readUInt32LE(offset + 24);
		// A ZIP64 marker means the real size doesn't fit in 32 bits (>= 4 GB) — well
		// past any sane bound, so reject without decoding the ZIP64 extra field.
		if (uncompressed === ZIP64_SIZE_MARKER) {
			throw new Error(
				`"${fileName}" declares a ZIP64-sized entry; refusing to parse a potential decompression bomb.`,
			);
		}

		totalUncompressed += uncompressed;
		if (totalUncompressed > MAX_OOXML_UNCOMPRESSED_BYTES) {
			throw new Error(
				`"${fileName}" decompresses to more than ${formatMB(MAX_OOXML_UNCOMPRESSED_BYTES)}; refusing to parse a potential decompression bomb.`,
			);
		}

		const nameLen = buffer.readUInt16LE(offset + 28);
		const extraLen = buffer.readUInt16LE(offset + 30);
		const commentLen = buffer.readUInt16LE(offset + 32);
		offset += CENTRAL_FILE_HEADER_MIN_SIZE + nameLen + extraLen + commentLen;
	}
}

/** Scans backwards for the End Of Central Directory record, tolerating a trailing comment. */
function findEndOfCentralDirectory(buffer: Buffer): number | undefined {
	if (buffer.length < EOCD_MIN_SIZE) return undefined;
	const scanLimit = Math.max(0, buffer.length - EOCD_MIN_SIZE - MAX_EOCD_COMMENT);
	for (let i = buffer.length - EOCD_MIN_SIZE; i >= scanLimit; i--) {
		if (buffer.readUInt32LE(i) === EOCD_SIGNATURE) return i;
	}
	return undefined;
}
