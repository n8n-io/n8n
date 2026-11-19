import { z } from 'zod';

import {
	archiveTooLarge,
	keepsText,
	type ArchiveLimits,
	type RepositoryArchive,
} from './github-archive';
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
): Promise<RepositoryArchive> {
	const result: RepositoryArchive = { paths: [], text: new Map(), oversized: new Map() };
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
	let textBytes = 0;
	const reads: Array<{ path: string; sha: string; size: number }> = [];
	for (const entry of entries) {
		// Git stores symlinks as blobs too. Read only regular files.
		if (entry.type !== 'blob' || (entry.mode !== '100644' && entry.mode !== '100755')) continue;
		const { size } = entry;
		if (size === undefined) throw unreadable();
		bytes += size;
		if (bytes > limits.maxUncompressedBytes) throw archiveTooLarge(root);

		const path = `${root}/${entry.path}`;
		result.paths.push(path);
		if (!keepsText(path)) continue;
		if (size > limits.maxTextFileBytes) {
			result.oversized.set(path, entry.sha);
			continue;
		}
		textBytes += size;
		if (textBytes > limits.maxTextBytes) throw archiveTooLarge(root);
		reads.push({ path, sha: entry.sha, size });
	}

	for (let i = 0; i < reads.length; i += FILE_BATCH_SIZE) {
		await Promise.all(
			reads.slice(i, i + FILE_BATCH_SIZE).map(async ({ path, sha, size }) => {
				const content = await getFile(path, sha);
				if (content.length !== size) throw unreadable();
				result.text.set(path, content.toString('utf8'));
			}),
		);
	}
	return result;
}

function unreadable(): SkillSourceReadError {
	return new SkillSourceReadError('unreachable', 'GitHub sent an answer n8n cannot read.');
}
