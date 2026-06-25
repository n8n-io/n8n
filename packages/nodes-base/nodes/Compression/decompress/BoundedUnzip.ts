import * as fflate from 'fflate';
import { ensureError, UserError } from 'n8n-workflow';

import { DecompressedSizeExceededError } from './DecompressedSizeExceededError';

// ZIP record signatures and the 32-bit value that marks a field as living in a
// ZIP64 extended-information extra field instead.
const ZIP64_SENTINEL = 0xffffffff;
const CENTRAL_DIR_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;
const ZIP64_EOCD_LOCATOR_SIG = 0x07064b50;
const ZIP64_EOCD_SIG = 0x06064b50;
const ZIP64_EXTRA_ID = 0x0001;

/**
 * fflate (0.7.x) does not consult the ZIP64 extended-information extra field
 * when only the central-directory uncompressed-size field is the 0xFFFFFFFF
 * sentinel, so it reports that sentinel (~4 GB) as `originalSize`. Walk the
 * central directory ourselves and map each such entry's name to its true
 * uncompressed size from the extra field, so the size bound is enforced on the
 * real size rather than the sentinel.
 */
function resolveZip64UncompressedSizes(data: Buffer): Map<string, number> {
	const sizes = new Map<string, number>();

	// The End Of Central Directory record lives in the last 22 + comment bytes.
	let eocd = data.length - 22;
	for (; eocd >= 0 && data.readUInt32LE(eocd) !== EOCD_SIG; eocd--);
	if (eocd < 0) return sizes;

	let count = data.readUInt16LE(eocd + 10);
	let cdOffset = data.readUInt32LE(eocd + 16);

	// A true ZIP64 archive stores the count/offset in the ZIP64 EOCD record,
	// pointed to by the locator that precedes the regular EOCD.
	if (count === 0xffff || cdOffset === ZIP64_SENTINEL) {
		const locator = eocd - 20;
		if (locator >= 0 && data.readUInt32LE(locator) === ZIP64_EOCD_LOCATOR_SIG) {
			const zip64Eocd = Number(data.readBigUInt64LE(locator + 8));
			if (
				zip64Eocd >= 0 &&
				zip64Eocd + 56 <= data.length &&
				data.readUInt32LE(zip64Eocd) === ZIP64_EOCD_SIG
			) {
				count = Number(data.readBigUInt64LE(zip64Eocd + 32));
				cdOffset = Number(data.readBigUInt64LE(zip64Eocd + 48));
			}
		}
	}

	let p = cdOffset;
	for (let i = 0; i < count && p + 46 <= data.length; i++) {
		if (data.readUInt32LE(p) !== CENTRAL_DIR_SIG) break;

		const fnLen = data.readUInt16LE(p + 28);
		const exLen = data.readUInt16LE(p + 30);
		const cmLen = data.readUInt16LE(p + 32);

		if (data.readUInt32LE(p + 24) === ZIP64_SENTINEL) {
			// Match fflate's name decoding: UTF-8 when the language-encoding flag
			// (bit 11) is set, otherwise latin1.
			const utf8 = (data.readUInt16LE(p + 8) & 0x800) !== 0;
			const name = data.toString(utf8 ? 'utf8' : 'latin1', p + 46, p + 46 + fnLen);

			// The ZIP64 extra field lists only the fields that overflowed, in a
			// fixed order; uncompressed size is first, so its 8 bytes lead.
			const exStart = p + 46 + fnLen;
			const exEnd = exStart + exLen;
			for (let q = exStart; q + 4 <= exEnd; ) {
				const id = data.readUInt16LE(q);
				const blockSize = data.readUInt16LE(q + 2);
				if (id === ZIP64_EXTRA_ID && q + 12 <= exEnd) {
					sizes.set(name, Number(data.readBigUInt64LE(q + 4)));
					break;
				}
				q += 4 + blockSize;
			}
		}

		p += 46 + fnLen + exLen + cmLen;
	}

	return sizes;
}

/**
 * Decompress a zip archive with upper bounds on total output size and number of
 * entries.
 *
 * Extraction is driven by the archive's central directory, the authoritative
 * list of members, so only the archive's own files are returned. Entries that
 * happen to live inside a stored member (office documents such as xlsx/docx are
 * themselves zip archives) are never surfaced. The size and entry-count limits
 * are enforced from the central directory metadata, before any entry is
 * inflated.
 */
export async function boundedUnzip(
	data: Buffer,
	maxOutputSize: number,
	maxEntries: number,
): Promise<Record<string, Buffer>> {
	const zip64Sizes = resolveZip64UncompressedSizes(data);

	return await new Promise<Record<string, Buffer>>((resolve, reject) => {
		let entryCount = 0;
		let totalSize = 0;
		let limitError: UserError | undefined;

		const filter = (file: fflate.UnzipFileInfo): boolean => {
			if (limitError) return false;
			// ZIP spec mandates '/' as path separator; a trailing slash marks a directory
			if (file.name.endsWith('/')) return false;

			entryCount++;
			if (entryCount > maxEntries) {
				limitError = new UserError(`The archive contains more than ${maxEntries} entries`);
				return false;
			}

			// fflate reports the 0xFFFFFFFF sentinel for ZIP64 entries; use the size
			// resolved from the ZIP64 extra field when one is available.
			totalSize += zip64Sizes.get(file.name) ?? file.originalSize;
			if (totalSize > maxOutputSize) {
				limitError = new DecompressedSizeExceededError(maxOutputSize);
				return false;
			}

			return true;
		};

		fflate.unzip(data, { filter }, (error, unzipped) => {
			if (limitError) {
				reject(limitError);
				return;
			}
			if (error) {
				reject(ensureError(error));
				return;
			}

			const result: Record<string, Buffer> = {};
			for (const [name, bytes] of Object.entries(unzipped)) {
				result[name] = Buffer.from(bytes);
			}
			resolve(result);
		});
	});
}
