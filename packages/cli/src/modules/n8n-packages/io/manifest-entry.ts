import type { PackageWriter } from './package-writer';
import { generateSlug } from './slug.utils';
import { PackageExportBlockedError } from '../entities/package-export.errors';
import type { ManifestEntry, PackageManifest } from '../spec/manifest.schema';

/**
 * Derived from the manifest so a new collection cannot ship without a
 * directory, a file name, and a fallback slug below.
 */
export type ManifestEntityCollection = {
	[K in keyof PackageManifest]-?: NonNullable<PackageManifest[K]> extends ManifestEntry[]
		? K
		: never;
}[keyof PackageManifest];

/**
 * Import derives a project's scope and a workflow's parent folder from these
 * path segments, so they are part of the package contract.
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

const FILE_NAMES = {
	projects: 'project.json',
	folders: 'folder.json',
	workflows: 'workflow.json',
	credentials: 'credential.json',
	dataTables: 'data-table.json',
	variables: 'variable.json',
	tags: 'tag.json',
} as const satisfies Record<ManifestEntityCollection, string>;

/** Readers accept [A-Za-z0-9._/-] in paths; an id must also stay one segment, so no `/` and no dots. */
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

const MAX_PATH_SEGMENT_LENGTH = 255;

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
 * Inside the owner project's target when that project is part of the export,
 * otherwise the top-level collection directory.
 */
export function projectScopedDirectory(
	collection: ManifestEntityCollection,
	ownerProjectId: string | undefined,
	projectTargetsById: Map<string, string> | undefined,
): string {
	const prefix = ownerProjectId ? projectTargetsById?.get(ownerProjectId) : undefined;
	return packageDirectory(collection, prefix);
}

export function entityFilePath(collection: ManifestEntityCollection, target: string): string {
	return `${target}/${FILE_NAMES[collection]}`;
}

export function createManifestEntry(
	collection: ManifestEntityCollection,
	baseDir: string,
	entity: { id: string; name: string },
): ManifestEntry {
	if (!SAFE_ID.test(entity.id)) {
		throw new PackageExportBlockedError(
			`${collection} entry "${entity.name}" has an id that cannot be used as a path segment. Export aborted.`,
			{
				description: `Id "${entity.id}" may contain only letters, digits, hyphens, and underscores.`,
			},
		);
	}

	const slug = generateSlug(entity.name, FALLBACK_SLUGS[collection]);
	const pathSegment = `${slug}-${entity.id}`;
	if (pathSegment.length > MAX_PATH_SEGMENT_LENGTH) {
		throw new PackageExportBlockedError(
			`${collection} entry "${entity.name}" creates a path segment longer than ${MAX_PATH_SEGMENT_LENGTH} characters. Shorten the entity name and retry the export.`,
			{
				description: `The generated path segment has ${pathSegment.length} characters.`,
			},
		);
	}

	return { id: entity.id, name: entity.name, target: `${baseDir}/${pathSegment}` };
}

export async function writeManifestEntry(
	writer: PackageWriter,
	collection: ManifestEntityCollection,
	baseDir: string,
	entity: { id: string; name: string },
	serialized: unknown,
): Promise<ManifestEntry> {
	const entry = createManifestEntry(collection, baseDir, entity);
	await writer.writeDirectory(entry.target);
	await writer.writeFile(
		entityFilePath(collection, entry.target),
		JSON.stringify(serialized, null, '\t'),
	);
	return entry;
}
