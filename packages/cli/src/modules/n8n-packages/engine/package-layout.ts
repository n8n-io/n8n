import type { ManifestEntry } from '../spec/manifest.schema';

export const PACKAGE_TOP_LEVEL_DIRS = {
	workflows: 'workflows',
	folders: 'folders',
	projects: 'projects',
} as const;

type TopLevelDir = (typeof PACKAGE_TOP_LEVEL_DIRS)[keyof typeof PACKAGE_TOP_LEVEL_DIRS];

// A top-level target begins with `${dir}/`; a nested one carries its scope's prefix first
// (e.g. `projects/x/folders/a`, `folders/a/workflows/wf`).
export function isTopLevelTarget(target: string, dir: TopLevelDir): boolean {
	return target.startsWith(`${dir}/`);
}

export function topLevelFolders(entries: ManifestEntry[] | undefined): ManifestEntry[] {
	return (entries ?? []).filter((entry) => isTopLevelTarget(entry.target, 'folders'));
}

export function topLevelWorkflows(entries: ManifestEntry[] | undefined): ManifestEntry[] {
	return (entries ?? []).filter((entry) => isTopLevelTarget(entry.target, 'workflows'));
}
