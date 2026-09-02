import { generateSlug } from './slug.utils';
import type { ManifestEntry, PackageManifest } from '../spec/manifest.schema';

/**
 * The manifest keys that hold entity entries, read off the manifest itself so a
 * new collection cannot ship without a directory and a fallback slug below.
 */
export type ManifestEntityCollection = {
	[K in keyof PackageManifest]-?: NonNullable<PackageManifest[K]> extends ManifestEntry[]
		? K
		: never;
}[keyof PackageManifest];

/**
 * The directory each collection is written into. Import derives a project's
 * scope and a workflow's parent folder from these segments, so they are part of
 * the package contract and cannot be flattened away.
 */
const DIRECTORIES = {
	projects: 'projects',
	folders: 'folders',
	workflows: 'workflows',
	credentials: 'credentials',
	dataTables: 'data-tables',
	variables: 'variables',
	tags: 'tags',
} as const satisfies Record<ManifestEntityCollection, string>;

/** Keeps the leaf from starting with a hyphen when a name slugifies to nothing. */
const FALLBACK_SLUGS = {
	projects: 'project',
	folders: 'folder',
	workflows: 'workflow',
	credentials: 'credential',
	dataTables: 'data-table',
	variables: 'variable',
	tags: 'tag',
} as const satisfies Record<ManifestEntityCollection, string>;

export function packageDirectory(
	collection: ManifestEntityCollection,
	basePrefix?: string,
): string {
	const directory = DIRECTORIES[collection];
	return basePrefix ? `${basePrefix}/${directory}` : directory;
}

/**
 * Builds a manifest entry targeting `<baseDir>/<name-slug>-<id>`. The id is what
 * makes the target independent of the rest of the export and of the order it was
 * processed in, so two exports of the same project can be compared, and a rename
 * moves the file without losing which entity it belongs to.
 *
 * Entity ids contain no hyphen, so the id is always the final hyphen-separated
 * segment of the leaf. A future entity keyed by UUID would break that.
 */
export function createManifestEntry(
	collection: ManifestEntityCollection,
	baseDir: string,
	entity: { id: string; name: string },
): ManifestEntry {
	const slug = generateSlug(entity.name, FALLBACK_SLUGS[collection]);
	return { id: entity.id, name: entity.name, target: `${baseDir}/${slug}-${entity.id}` };
}
