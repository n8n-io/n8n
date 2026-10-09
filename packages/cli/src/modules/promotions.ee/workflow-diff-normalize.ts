import { jsonParse, type INode } from 'n8n-workflow';
import { createHash } from 'node:crypto';

import { visitWorkflowCredentials } from '@/modules/n8n-packages/entities/credential/workflow-credential-references';

import type { PackageFile } from './base-branch-files';

/**
 * Blanks the credential names carried inside a workflow's nodes. A node keeps a
 * `name` next to each credential id, but the binding resolves by id and the name
 * is only a display cache. After a credential is renamed it drifts between
 * instances — each side re-derives it from its own credential while a branch copy
 * stays frozen — so left in the diff a rename makes the workflow look modified on
 * every preview. Keep the id and type the binding needs; drop the volatile name.
 */
function normalizeWorkflowContentForDiff(content: string): string | undefined {
	let parsed: { nodes?: INode[] };
	try {
		parsed = jsonParse<{ nodes?: INode[] }>(content);
	} catch {
		return undefined;
	}
	const changed = visitWorkflowCredentials(parsed.nodes, (_type, details) => {
		if (details.name === '') return false;
		details.name = '';
		return true;
	});
	// Re-hash only when a name was blanked, so a credential-free workflow keeps
	// its original hash and re-serialization never shifts an unrelated file.
	return changed ? JSON.stringify(parsed) : undefined;
}

/** The same git blob hash `HashingPackageWriter` and `git ls-tree` produce. */
function gitBlobSha(content: string): string {
	return createHash('sha1')
		.update(`blob ${Buffer.byteLength(content)}\0`)
		.update(content)
		.digest('hex');
}

/**
 * Re-hashes every workflow file over content whose volatile credential names are
 * blanked, so the promotion diff ignores a credential rename. Other files keep
 * their original hash. Both sides must pass through this with the file content so
 * two otherwise-equal workflows match.
 */
export function normalizeWorkflowHashes(
	files: readonly PackageFile[],
	contentByPath: ReadonlyMap<string, string>,
): PackageFile[] {
	return files.map((file) => {
		if (file.type !== 'workflow') return file;
		const content = contentByPath.get(file.path);
		if (content === undefined) return file;
		const normalized = normalizeWorkflowContentForDiff(content);
		if (normalized === undefined) return file;
		return { ...file, blobSha: gitBlobSha(normalized) };
	});
}
