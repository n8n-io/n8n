import type { ManifestEntry } from '../spec/manifest.schema';

// Within any scope — the package root, or a `projects/<slug>/` namespace — a workflow lives at
// `<base>workflows/<slug>` (scope-root) or under a folder at `<base>folders/…/workflows/<slug>`, and
// folders live at `<base>folders/<slug>[/<child>…]` (children nest as direct dirs). Nesting is encoded
// entirely in the target-path prefix, so a `basePrefix` selects a scope's entries.

/** Folder entries within a scope — the whole `<basePrefix>folders/…` subtree. */
export function foldersInScope(
	entries: ManifestEntry[] | undefined,
	basePrefix = '',
): ManifestEntry[] {
	return (entries ?? []).filter((entry) => entry.target.startsWith(`${basePrefix}folders/`));
}

/** Workflow entries within a scope — both scope-root (`<basePrefix>workflows/…`) and folder-nested (`<basePrefix>folders/…/workflows/…`). */
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

/**
 * The source folder id a workflow is nested under, derived from its manifest target. A workflow lives at
 * `<folderTarget>/workflows/<slug>`, so the prefix before the reserved `workflows` container names its
 * folder; looking that target up yields the folder's source id — which equals the recreated folder id,
 * since folders reuse their source ids on import. A scope-root workflow (`<base>workflows/<slug>`, or a
 * project's own root) has no in-package folder and returns null.
 */
export function deriveParentFolderId(
	workflowTarget: string,
	folderTargetToId: Map<string, string>,
): string | null {
	const idx = workflowTarget.lastIndexOf('/workflows/');
	if (idx === -1) return null;
	return folderTargetToId.get(workflowTarget.slice(0, idx)) ?? null;
}
