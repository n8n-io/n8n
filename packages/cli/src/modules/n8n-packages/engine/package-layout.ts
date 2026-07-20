import { UserError } from 'n8n-workflow';

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

	const containerTarget = workflowTarget.slice(0, idx);

	if (!containerTarget.includes('folders/')) return null;
	const folderId = folderTargetToId.get(containerTarget);
	if (folderId === undefined) {
		throw new UserError(
			`Package workflow at "${workflowTarget}" is nested under folder "${containerTarget}", which is missing from the manifest.`,
		);
	}
	return folderId;
}
