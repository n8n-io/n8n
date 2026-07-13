import type { ManifestEntry } from '../spec/manifest.schema';

export function foldersInScope(
	entries: ManifestEntry[] | undefined,
	basePrefix = '',
): ManifestEntry[] {
	return (entries ?? []).filter((entry) => entry.target.startsWith(`${basePrefix}folders/`));
}

export function workflowsInScope(
	entries: ManifestEntry[] | undefined,
	basePrefix = '',
): ManifestEntry[] {
	return (entries ?? []).filter(
		(entry) =>
			entry.target.startsWith(`${basePrefix}workflows/`) ||
			entry.target.startsWith(`${basePrefix}folders/`),
	);
}

export function deriveParentFolderId(
	workflowTarget: string,
	folderTargetToId: Map<string, string>,
): string | null {
	const idx = workflowTarget.lastIndexOf('/workflows/');
	if (idx === -1) return null;
	return folderTargetToId.get(workflowTarget.slice(0, idx)) ?? null;
}
