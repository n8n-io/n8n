import { UserError } from 'n8n-workflow';

const EOCD_SIGNATURE = 0x06054b50;
const ZIP64_EOCD_SIGNATURE = 0x06064b50;
const ZIP64_EOCD_LOCATOR_SIGNATURE = 0x07064b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const LOCAL_HEADER_SIGNATURE = 0x04034b50;

const EOCD_SIZE = 22;
const ZIP64_EOCD_SIZE = 56;
const ZIP64_EOCD_LOCATOR_SIZE = 20;
const CENTRAL_DIRECTORY_HEADER_SIZE = 46;
const LOCAL_HEADER_SIZE = 30;

const MAX_COMMENT_SIZE = 0xffff;
const UTF8_NAME_FLAG = 0x800;
const ZIP64_EXTRA_FIELD_ID = 0x0001;
/** A 32-bit field holding this marks its real value as living in the ZIP64 extra field. */
const ZIP64_SENTINEL = 0xffffffff;

export const STORED = 0;
export const DEFLATED = 8;

export interface ZipEntry {
	name: string;
	compression: number;
	compressedSize: number;
	/**
	 * Uncompressed size as declared by the archive, or `undefined` when the
	 * archive declares it unresolvably. Only ever a hint: the value is supplied
	 * by the archive and may over- or understate the real output.
	 */
	declaredSize?: number;
	dataOffset: number;
}

function invalidZip(): never {
	throw new UserError('invalid zip data');
}

function readUInt64(data: Buffer, offset: number): number {
	const value = data.readBigUInt64LE(offset);
	if (value > BigInt(Number.MAX_SAFE_INTEGER)) invalidZip();
	return Number(value);
}

function findEndOfCentralDirectory(data: Buffer): number {
	const lowest = Math.max(0, data.length - EOCD_SIZE - MAX_COMMENT_SIZE);
	for (let offset = data.length - EOCD_SIZE; offset >= lowest; offset--) {
		// The signature can also occur inside the archive comment, so require the
		// record's own comment length to reach exactly the end of the archive.
		if (
			data.readUInt32LE(offset) === EOCD_SIGNATURE &&
			offset + EOCD_SIZE + data.readUInt16LE(offset + 20) === data.length
		) {
			return offset;
		}
	}
	invalidZip();
}

function locateCentralDirectory(
	data: Buffer,
	eocdOffset: number,
): { offset: number; entryCount: number } {
	const locatorOffset = eocdOffset - ZIP64_EOCD_LOCATOR_SIZE;
	if (locatorOffset >= 0 && data.readUInt32LE(locatorOffset) === ZIP64_EOCD_LOCATOR_SIGNATURE) {
		const zip64Offset = readUInt64(data, locatorOffset + 8);
		if (
			zip64Offset + ZIP64_EOCD_SIZE <= data.length &&
			data.readUInt32LE(zip64Offset) === ZIP64_EOCD_SIGNATURE
		) {
			return {
				offset: readUInt64(data, zip64Offset + 48),
				entryCount: readUInt64(data, zip64Offset + 32),
			};
		}
	}

	return {
		offset: data.readUInt32LE(eocdOffset + 16),
		entryCount: data.readUInt16LE(eocdOffset + 10),
	};
}

/**
 * Replaces ZIP64 sentinels with the real values from the ZIP64
 * extended-information extra field. `fields` must be passed in the order the
 * spec stores them — uncompressed size, compressed size, local header offset —
 * because the extra field holds only the sentinel-carrying ones, in that order.
 *
 * The lookup runs regardless of whether the archive also carries a ZIP64
 * end-of-central-directory record. Writers routinely emit the per-entry extra
 * field with a plain EOCD, and readers that gate on the EOCD then mistake the
 * sentinel for a real ~4 GB size.
 *
 * Returns `undefined` when a sentinel cannot be resolved.
 */
function resolveZip64Sentinels(extra: Buffer, fields: number[]): number[] | undefined {
	const sentinelCount = fields.filter((field) => field === ZIP64_SENTINEL).length;
	if (sentinelCount === 0) return fields;

	for (let offset = 0; offset + 4 <= extra.length; ) {
		const blockSize = extra.readUInt16LE(offset + 2);
		const body = offset + 4;
		if (body + blockSize > extra.length) return undefined;

		if (extra.readUInt16LE(offset) === ZIP64_EXTRA_FIELD_ID) {
			if (blockSize < sentinelCount * 8) return undefined;
			let taken = 0;
			return fields.map((field) =>
				field === ZIP64_SENTINEL ? readUInt64(extra, body + 8 * taken++) : field,
			);
		}

		offset = body + blockSize;
	}

	return undefined;
}

/** Resolves where an entry's compressed bytes start, via its local file header. */
function findDataOffset(data: Buffer, localHeaderOffset: number): number {
	if (
		localHeaderOffset < 0 ||
		localHeaderOffset + LOCAL_HEADER_SIZE > data.length ||
		data.readUInt32LE(localHeaderOffset) !== LOCAL_HEADER_SIGNATURE
	) {
		invalidZip();
	}

	return (
		localHeaderOffset +
		LOCAL_HEADER_SIZE +
		data.readUInt16LE(localHeaderOffset + 26) +
		data.readUInt16LE(localHeaderOffset + 28)
	);
}

/**
 * Reads the archive's central directory, the authoritative list of members.
 *
 * Driving extraction from it — rather than scanning the byte stream for local
 * file headers — is what keeps entries nested inside a member (office documents
 * such as xlsx/docx are themselves zip archives) from being surfaced as members
 * of the outer archive.
 *
 * Yields entries one at a time so a caller enforcing an entry-count limit can
 * stop before the whole directory has been read.
 */
export function* readCentralDirectory(data: Buffer): Generator<ZipEntry> {
	const eocdOffset = findEndOfCentralDirectory(data);
	const { offset: centralDirectoryOffset, entryCount } = locateCentralDirectory(data, eocdOffset);

	let offset = centralDirectoryOffset;

	for (let index = 0; index < entryCount; index++) {
		if (
			offset < 0 ||
			offset + CENTRAL_DIRECTORY_HEADER_SIZE > data.length ||
			data.readUInt32LE(offset) !== CENTRAL_DIRECTORY_SIGNATURE
		) {
			invalidZip();
		}

		const nameLength = data.readUInt16LE(offset + 28);
		const extraLength = data.readUInt16LE(offset + 30);
		const commentLength = data.readUInt16LE(offset + 32);
		const nameStart = offset + CENTRAL_DIRECTORY_HEADER_SIZE;
		const extraStart = nameStart + nameLength;
		const nextOffset = extraStart + extraLength + commentLength;
		if (nextOffset > data.length) invalidZip();

		const rawSize = data.readUInt32LE(offset + 24);
		const rawCompressedSize = data.readUInt32LE(offset + 20);
		const rawLocalHeaderOffset = data.readUInt32LE(offset + 42);
		const resolved = resolveZip64Sentinels(data.subarray(extraStart, extraStart + extraLength), [
			rawSize,
			rawCompressedSize,
			rawLocalHeaderOffset,
		]);

		// An unresolvable sentinel is tolerable for the uncompressed size, which is
		// only a hint, but not for the two fields needed to locate the bytes.
		if (
			!resolved &&
			(rawCompressedSize === ZIP64_SENTINEL || rawLocalHeaderOffset === ZIP64_SENTINEL)
		) {
			invalidZip();
		}
		const [, compressedSize, localHeaderOffset] = resolved ?? [
			rawSize,
			rawCompressedSize,
			rawLocalHeaderOffset,
		];

		const dataOffset = findDataOffset(data, localHeaderOffset);
		if (dataOffset + compressedSize > data.length) invalidZip();

		const isUtf8 = (data.readUInt16LE(offset + 8) & UTF8_NAME_FLAG) !== 0;

		yield {
			name: data.toString(isUtf8 ? 'utf8' : 'latin1', nameStart, extraStart),
			compression: data.readUInt16LE(offset + 10),
			compressedSize,
			declaredSize: resolved?.[0],
			dataOffset,
		};

		offset = nextOffset;
	}
}
