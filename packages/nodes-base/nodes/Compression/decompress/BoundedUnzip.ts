import * as fflate from 'fflate';
import { ensureError, UserError } from 'n8n-workflow';

import { DecompressedSizeExceededError } from './DecompressedSizeExceededError';

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

			totalSize += file.originalSize;
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
