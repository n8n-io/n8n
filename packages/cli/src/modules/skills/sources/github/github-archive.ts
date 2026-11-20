import { AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH } from '@n8n/api-types';
import type { Readable } from 'node:stream';
import { createHash } from 'node:crypto';
import { Parser, type ReadEntry } from 'tar';

import { isInside, SKILL_FILE } from './skill-discovery';
import { SkillSourceReadError } from '../../errors/skill-source-read.error';

export type ArchiveLimits = {
	/** Compressed bytes of the whole repository. Files outside the folder count here too. */
	maxDownloadBytes: number;
	/** Files and folders under the folder of the link. */
	maxEntries: number;
	/** Uncompressed bytes under the folder of the link. */
	maxUncompressedBytes: number;
	/** File bytes that one archive keeps. */
	maxRetainedBytes: number;
	/** Raw byte limit before decoding a file. Larger files keep only their paths. */
	maxFileBytes: number;
};

export const DEFAULT_ARCHIVE_LIMITS: ArchiveLimits = {
	maxDownloadBytes: 512 * 1024 * 1024,
	maxEntries: 50_000,
	maxUncompressedBytes: 200 * 1024 * 1024,
	maxRetainedBytes: 20 * 1024 * 1024,
	// One UTF-16 code unit can use up to three bytes in UTF-8.
	maxFileBytes: 3 * AGENT_SKILL_REFERENCE_CONTENT_MAX_LENGTH,
};

/**
 * The files of a repository folder at one commit. Every file keeps its path, so the picker can
 * list the files that an import skips. Read the file bytes before deciding how to store them.
 */
export type RepositoryArchive = {
	paths: string[];
	files: Map<string, Buffer>;
	/** Oversized files. Keep a SHA-256 hash only for SKILL.md. */
	oversized: Map<string, string | null>;
};

/** About the bytes that an archive holds in memory, for the cache budget. */
export function archiveSize(archive: RepositoryArchive): number {
	let bytes = 0;
	for (const path of archive.paths) bytes += path.length;
	for (const file of archive.files.values()) bytes += file.length;
	for (const hash of archive.oversized.values()) bytes += hash?.length ?? 0;
	return bytes;
}

export function archiveTooLarge(root: string): SkillSourceReadError {
	return new SkillSourceReadError(
		'archive_too_large',
		root === ''
			? 'The repository is too large for n8n to read. Link to the folder of the skills.'
			: 'The folder is too large for n8n to read. Link to a smaller folder.',
	);
}

/**
 * Reads a GitHub tarball (`codeload.github.com/<owner>/<repo>/tar.gz/<sha>`) as it streams in.
 * GitHub puts every file under one folder named after the repository and the commit. The paths
 * here leave it out. Only the entries under `root` are kept, and only they count toward the
 * entry and size limits. Links, folders and other entries that are not files are left out.
 */
export async function readRepositoryArchive(
	source: Readable,
	options: { root?: string; signal?: AbortSignal; limits?: ArchiveLimits } = {},
): Promise<RepositoryArchive> {
	const { root = '', signal, limits = DEFAULT_ARCHIVE_LIMITS } = options;
	const paths: string[] = [];
	const files = new Map<string, Buffer>();
	const oversized = new Map<string, string | null>();
	let downloaded = 0;
	let entries = 0;
	let bytes = 0;
	let retainedBytes = 0;

	return await new Promise((resolve, reject) => {
		let settled = false;
		const parser = new Parser({ strict: true });
		const onAbort = () =>
			fail(new SkillSourceReadError('unreachable', 'GitHub took too long to send the files.'));
		const settle = () => {
			settled = true;
			signal?.removeEventListener('abort', onAbort);
		};
		const fail = (error: Error) => {
			if (settled) return;
			settle();
			reject(error);
			// Stops the download and the decompression, so the rest of the archive is not read.
			parser.abort(error);
			source.destroy();
		};

		if (signal?.aborted) return onAbort();
		signal?.addEventListener('abort', onAbort, { once: true });

		parser.on('entry', (entry: ReadEntry) => {
			const path = withoutTopFolder(entry.path);
			if (path === undefined || !isInside(path, root)) {
				entry.resume();
				return;
			}
			entries += 1;
			bytes += entry.size;
			if (entries > limits.maxEntries || bytes > limits.maxUncompressedBytes) {
				entry.resume();
				return fail(archiveTooLarge(root));
			}
			if (entry.type !== 'File') {
				entry.resume();
				return;
			}
			paths.push(path);
			if (entry.size > limits.maxFileBytes) {
				if (path.split('/').at(-1) !== SKILL_FILE) {
					oversized.set(path, null);
					entry.resume();
					return;
				}
				const hash = createHash('sha256');
				entry.on('data', (chunk: Buffer) => hash.update(chunk));
				entry.on('end', () => oversized.set(path, hash.digest('hex')));
				return;
			}
			retainedBytes += entry.size;
			if (retainedBytes > limits.maxRetainedBytes) {
				entry.resume();
				return fail(archiveTooLarge(root));
			}
			const chunks: Buffer[] = [];
			entry.on('data', (chunk: Buffer) => chunks.push(chunk));
			entry.on('end', () => files.set(path, Buffer.concat(chunks)));
		});
		parser.on('error', (error: Error) =>
			fail(
				new SkillSourceReadError('unreachable', 'GitHub sent an archive that n8n cannot read.', {
					cause: error,
				}),
			),
		);
		parser.on('end', () => {
			if (settled) return;
			settle();
			resolve({ paths, files, oversized });
		});

		source.on('data', (chunk: Buffer) => {
			downloaded += chunk.length;
			if (downloaded > limits.maxDownloadBytes) {
				return fail(
					new SkillSourceReadError(
						'archive_too_large',
						'The repository is too large for n8n to download.',
					),
				);
			}
			if (!parser.write(chunk)) {
				source.pause();
				parser.once('drain', () => source.resume());
			}
		});
		source.on('end', () => parser.end());
		source.on('error', (error: Error) =>
			fail(
				new SkillSourceReadError('unreachable', 'n8n could not download the files from GitHub.', {
					cause: error,
				}),
			),
		);
	});
}

/** `repo-<sha>/skills/a/SKILL.md` to `skills/a/SKILL.md`. Undefined for the top folder. */
function withoutTopFolder(path: string): string | undefined {
	const slash = path.indexOf('/');
	// A tarball names a folder with a slash at the end.
	const rest = slash === -1 ? '' : path.slice(slash + 1).replace(/\/$/, '');
	return rest === '' ? undefined : rest;
}
