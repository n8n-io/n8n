import type { ManifestEntry } from '../spec/manifest.schema';

/**
 * Top-level package directories. An entry's `target` path begins with one of
 * these, or is nested beneath a folder/project scope.
 */
export const PACKAGE_TOP_LEVEL_DIRS = {
	workflows: 'workflows',
	folders: 'folders',
	projects: 'projects',
} as const;

type TopLevelDir = (typeof PACKAGE_TOP_LEVEL_DIRS)[keyof typeof PACKAGE_TOP_LEVEL_DIRS];

/**
 * True when an entry sits at the package top level under `dir` rather than nested
 * inside a folder or project. The export writes the `folders/`/`workflows/`/`projects/`
 * segment once per scope, so a top-level entry's target begins with `${dir}/` while a
 * project-nested entry begins with `projects/…` (e.g. `projects/x/folders/a`,
 * `projects/x/workflows/wf`) and a folder-nested workflow begins with `folders/…`
 * (e.g. `folders/a/workflows/wf`).
 */
export function isTopLevelTarget(target: string, dir: TopLevelDir): boolean {
	return target.startsWith(`${dir}/`);
}

/** Manifest folder entries at the package top level (`folders/…`), excluding project-nested ones. */
export function topLevelFolders(entries: ManifestEntry[] | undefined): ManifestEntry[] {
	return (entries ?? []).filter((entry) => isTopLevelTarget(entry.target, 'folders'));
}

/** Manifest workflow entries at the package top level (`workflows/…`), excluding folder/project-nested ones. */
export function topLevelWorkflows(entries: ManifestEntry[] | undefined): ManifestEntry[] {
	return (entries ?? []).filter((entry) => isTopLevelTarget(entry.target, 'workflows'));
}
