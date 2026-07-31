import { readdir, readFile, stat } from 'node:fs/promises';
import { join, sep } from 'node:path';

import {
	TarPackageReader,
	type TarReaderLimits,
} from '../../n8n-packages/io/tar/tar-package-reader';
import { TarPackageWriter } from '../../n8n-packages/io/tar/tar-package-writer';

/**
 * Unpack/repack helpers for the github-review model: the .n8np archive is
 * committed to the review branch as its individual files (exporters already
 * pretty-print JSON), so the PR's file diff is human-reviewable. Apply reads
 * the tree back and repacks it into a buffer the regular import consumes.
 */

/** Generous fixed limits for the POC; real packages are far smaller. */
const READER_LIMITS: TarReaderLimits = {
	maxUncompressedBytes: 256 * 1024 * 1024,
	maxEntryBytes: 64 * 1024 * 1024,
	maxEntries: 10_000,
	maxPathLength: 512,
};

export interface PackageFile {
	path: string;
	content: Buffer;
}

export async function unpackPackageFiles(packageBuffer: Buffer): Promise<PackageFile[]> {
	const reader = new TarPackageReader(packageBuffer, READER_LIMITS);
	const paths = await reader.listEntries();
	return await Promise.all(
		paths.map(async (path) => ({ path, content: await reader.readFile(path) })),
	);
}

export async function packPackageFiles(files: PackageFile[]): Promise<Buffer> {
	const writer = new TarPackageWriter();
	for (const file of files) writer.writeFile(file.path, file.content);
	const chunks: Buffer[] = [];
	for await (const chunk of writer.finalize()) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
	}
	return Buffer.concat(chunks);
}

/** Read every file under a directory tree as package entries with posix-relative paths. */
export async function readPackageDir(dir: string): Promise<PackageFile[]> {
	const names = await readdir(dir, { recursive: true });
	const files: PackageFile[] = [];
	for (const name of names) {
		const absolute = join(dir, name);
		if (!(await stat(absolute)).isFile()) continue;
		files.push({ path: name.split(sep).join('/'), content: await readFile(absolute) });
	}
	return files;
}
