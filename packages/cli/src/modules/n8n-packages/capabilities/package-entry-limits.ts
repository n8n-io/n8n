import { formatBytes } from '@n8n/utils/number/bytes';

import { packageSizeLimitMessage } from './base64-limits';
import { PackageExportBlockedError } from '../entities/package-export.errors';
import type { PackageWriter } from '../io/package-writer';
import type { PackageImportConfig } from '../n8n-packages.config';

/** The limits with which an import reads the files of a package. */
export type PackageEntryLimits = Pick<
	PackageImportConfig,
	'maxEntryBytes' | 'maxEntries' | 'maxUncompressedBytes'
>;

/** Two sizes in words. Rounded sizes that look the same are given in bytes. */
function sizesInWords(size: number, limit: number): [string, string] {
	const [sizeText, limitText] = [formatBytes(size), formatBytes(limit)];
	return sizeText === limitText ? [`${size}B`, `${limit}B`] : [sizeText, limitText];
}

/** The size limit of one file in a package, in words that name the setting that changes it. */
export function packageEntrySizeMessage(path: string, bytes: number, maxEntryBytes: number) {
	const [size, limit] = sizesInWords(bytes, maxEntryBytes);
	return `The workflow package has a file of ${size} ("${path}"), and the limit for one file of a package is ${limit}. An admin can change the limit with N8N_IMPORT_MAX_ENTRY_BYTES.`;
}

/**
 * Checks each file of a package against the limits of the import, while the export writes it.
 * The compressed size of a package says nothing about one file, so without this check a package
 * that an export writes can fail the import of an instance with the same settings.
 */
export class EntryLimitedPackageWriter implements PackageWriter {
	private entryCount = 0;

	private totalBytes = 0;

	constructor(
		private readonly writer: PackageWriter,
		private readonly limits: PackageEntryLimits,
	) {}

	async writeFile(path: string, content: string | Buffer): Promise<void> {
		const bytes = Buffer.byteLength(content);
		this.countEntry();
		if (bytes > this.limits.maxEntryBytes) {
			throw new PackageExportBlockedError(
				packageEntrySizeMessage(path, bytes, this.limits.maxEntryBytes),
			);
		}
		this.totalBytes += bytes;
		if (this.totalBytes > this.limits.maxUncompressedBytes) {
			throw new PackageExportBlockedError(
				packageSizeLimitMessage({
					maxBytes: this.limits.maxUncompressedBytes,
					setting: 'N8N_IMPORT_MAX_UNCOMPRESSED_BYTES',
				}),
			);
		}
		await this.writer.writeFile(path, content);
	}

	async writeDirectory(path: string): Promise<void> {
		this.countEntry();
		await this.writer.writeDirectory(path);
	}

	private countEntry(): void {
		this.entryCount += 1;
		if (this.entryCount > this.limits.maxEntries) {
			throw new PackageExportBlockedError(
				`The workflow package has more than ${this.limits.maxEntries} files. An admin can change the limit with N8N_IMPORT_MAX_ENTRIES.`,
			);
		}
	}
}
