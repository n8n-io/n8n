import { createHash } from 'node:crypto';
import type { Readable } from 'node:stream';
import { z } from 'zod';

import {
	archiveTooLarge,
	fileSelectionLimits,
	type ArchiveLimits,
	type RepositoryArchive,
} from './github-archive';
import { findSkillFolders, selectSkillFiles, SKILL_FILE } from './skill-discovery';
import { SkillSourceReadError } from '../../errors/skill-source-read.error';

// GitHub limits recursive trees to 7 MB. Leave room for the response envelope.
const MAX_TREE_BYTES = 8 * 1024 * 1024;
const FILE_BATCH_SIZE = 4;

const objectId = z.string().regex(/^[0-9a-f]{40,64}$/);
const treeResponse = z.object({
	truncated: z.boolean(),
	tree: z.array(
		z.object({
			path: z
				.string()
				.refine((path) =>
					path.split('/').every((segment) => segment && segment !== '.' && segment !== '..'),
				),
			mode: z.string(),
			type: z.string(),
			sha: objectId,
			size: z.number().int().nonnegative().optional(),
		}),
	),
});

export async function readRepositoryFolder(
	root: string,
	revision: string,
	limits: ArchiveLimits,
	getTree: (sha: string, recursive: boolean, maxBytes: number) => Promise<unknown>,
	getFile: (path: string, sha: string) => Promise<Buffer>,
	streamFile: (path: string, sha: string) => Promise<Readable>,
): Promise<RepositoryArchive> {
	const result: RepositoryArchive = { paths: [], files: new Map(), oversized: new Map() };
	if (!objectId.safeParse(revision).success) throw unreadable();

	const tree = async (sha: string, recursive = false) => {
		const body = treeResponse.safeParse(await getTree(sha, recursive, MAX_TREE_BYTES));
		if (!body.success) throw unreadable();
		if (body.data.truncated) throw archiveTooLarge(root);
		return body.data.tree;
	};

	// Read only the immediate children of each ancestor. Recurse from the linked folder.
	let sha = revision;
	for (const segment of root.split('/')) {
		const child = (await tree(sha)).find(
			(entry) => entry.type === 'tree' && entry.path === segment,
		);
		if (!child) return result;
		sha = child.sha;
	}
	const entries = await tree(sha, true);
	if (entries.length > limits.maxEntries) throw archiveTooLarge(root);

	let bytes = 0;
	let retainedBytes = 0;
	const reads: Array<{ path: string; sha: string; size: number; oversized: boolean }> = [];
	const blobs = new Map<string, { sha: string; size: number }>();
	for (const entry of entries) {
		// Git stores symlinks as blobs too. Read only regular files.
		if (entry.type !== 'blob' || (entry.mode !== '100644' && entry.mode !== '100755')) continue;
		const { size } = entry;
		if (size === undefined) throw unreadable();
		bytes += size;
		if (bytes > limits.maxUncompressedBytes) throw archiveTooLarge(root);

		const path = `${root}/${entry.path}`;
		result.paths.push(path);
		blobs.set(path, { sha: entry.sha, size });
	}
	const skillFolders = new Set(findSkillFolders(result.paths, root).folders);
	// Each file is one request. Fetch only the files that a skill in the picker can keep. The
	// other files keep their path, so the review lists them.
	const starvedFolders = new Set<string>();
	const keep = selectSkillFiles(
		new Map([...blobs].map(([path, { size }]) => [path, size])),
		skillFolders,
		fileSelectionLimits(limits),
		starvedFolders,
	);
	if (starvedFolders.size > 0) result.starvedFolders = starvedFolders;
	for (const [path, { sha, size }] of blobs) {
		if (!keep.has(path)) continue;
		const oversized = size > limits.maxFileBytes;
		if (oversized && !path.endsWith(`/${SKILL_FILE}`)) {
			result.oversized.set(path, null);
			continue;
		}
		if (!oversized) retainedBytes += size;
		if (retainedBytes > limits.maxRetainedBytes) throw archiveTooLarge(root);
		reads.push({ path, sha, size, oversized });
	}

	for (let i = 0; i < reads.length; i += FILE_BATCH_SIZE) {
		await Promise.all(
			reads.slice(i, i + FILE_BATCH_SIZE).map(async ({ path, sha, size, oversized }) => {
				if (oversized) {
					// Keep the tarball reader's hash so unchanged skills stay hidden after an upgrade.
					result.oversized.set(path, await hashSkill(await streamFile(path, sha), size));
					return;
				}
				const content = await getFile(path, sha);
				if (content.length !== size) throw unreadable();
				result.files.set(path, content);
			}),
		);
	}
	return result;
}

async function hashSkill(source: Readable, size: number): Promise<string> {
	const hash = createHash('sha256');
	let bytes = 0;
	try {
		for await (const chunk of source) {
			if (!Buffer.isBuffer(chunk)) throw unreadable();
			bytes += chunk.length;
			if (bytes > size) throw unreadable();
			hash.update(chunk);
		}
	} catch (error) {
		if (error instanceof SkillSourceReadError) throw error;
		throw new SkillSourceReadError('unreachable', 'n8n could not download the files from GitHub.', {
			cause: error,
		});
	}
	if (bytes !== size) throw unreadable();
	return hash.digest('hex');
}

function unreadable(): SkillSourceReadError {
	return new SkillSourceReadError('unreachable', 'GitHub sent an answer n8n cannot read.');
}
