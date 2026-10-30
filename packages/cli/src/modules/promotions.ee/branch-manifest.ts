import { isRecord } from '@n8n/utils/is-record';
import { jsonParse } from 'n8n-workflow';

import {
	PACKAGE_ENTITY_LAYOUT,
	type ManifestEntityCollection,
} from '@/modules/n8n-packages/io/manifest-entry';
import type { ManifestEntry, PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';
import { packageManifestSchema } from '@/modules/n8n-packages/spec/manifest.schema';

import { BlobCache } from './blob-cache';

/**
 * The branch holds a `manifest.json` without these lists. Each list is the same on every branch
 * that adds an entity, so two merge requests that add entities next to each other would conflict
 * on it. The entity files hold the same facts, so every read from Git derives the lists from them.
 */
export const DERIVED_COLLECTIONS = [
	'projects',
	'folders',
	'workflows',
	'credentials',
	'dataTables',
	'variables',
	'tags',
] as const satisfies readonly ManifestEntityCollection[];

type DerivedCollection = (typeof DERIVED_COLLECTIONS)[number];
export type DerivedLists = Pick<PackageManifest, DerivedCollection>;

const FILE_NAMES = new Set<string>(
	DERIVED_COLLECTIONS.map((collection) => PACKAGE_ENTITY_LAYOUT[collection].fileName),
);

const READ_CHUNK_SIZE = 100;

/** The manifest as the branch stores it: without the lists that the entity files hold. */
export function stripDerivedLists(manifest: PackageManifest): PackageManifest {
	const stripped = { ...manifest };
	for (const collection of DERIVED_COLLECTIONS) delete stripped[collection];
	return stripped;
}

type EntityLocation = { collection: DerivedCollection; target: string; slug: string; id: string };

/**
 * Where an entity file sits: `<collection directory>/<slug>-<id>/<file name>`. A folder can also
 * sit deeper, under a chain of folder directories: `folders/<a>/<b>/folder.json`.
 */
function locateEntity(path: string): EntityLocation | undefined {
	const segments = path.split('/');
	if (segments.length < 3) return undefined;
	const [directory, entry, fileName] = segments.slice(-3);
	if (!FILE_NAMES.has(fileName)) return undefined;
	const collection = DERIVED_COLLECTIONS.find((candidate) => {
		const layout = PACKAGE_ENTITY_LAYOUT[candidate];
		if (layout.fileName !== fileName) return false;
		return candidate === 'folders'
			? segments.slice(0, -2).includes(layout.directory)
			: layout.directory === directory;
	});
	if (!collection) return undefined;
	const split = entry.lastIndexOf('-');
	return {
		collection,
		target: segments.slice(0, -1).join('/'),
		slug: split > 0 ? entry.slice(0, split) : entry,
		id: split > 0 ? entry.slice(split + 1) : entry,
	};
}

/** The folder that repository paths sit in, as a path prefix. */
export function packageRoot(prefix = ''): string {
	return prefix === '' ? '' : `${prefix}/`;
}

type LocatedEntity = { path: string; location: EntityLocation };

/** The entity files among `paths`, with their location. A path outside `prefix` is left out. */
function locateEntities(paths: Iterable<string>, prefix = ''): LocatedEntity[] {
	const root = packageRoot(prefix);
	const located: LocatedEntity[] = [];
	for (const path of paths) {
		if (!path.startsWith(root)) continue;
		const location = locateEntity(path.slice(root.length));
		if (location) located.push({ path, location });
	}
	return located;
}

/** The entity files among `paths`. A path outside `prefix` is left out. */
export function entityFilePaths(paths: Iterable<string>, prefix = ''): string[] {
	return locateEntities(paths, prefix).map(({ path }) => path);
}

type Derived = { collection: DerivedCollection; entry: ManifestEntry; isArchived: boolean };

/** What an entity file says about itself. */
type EntityMeta = { id?: string; name?: string; isArchived: boolean };

const NO_META: EntityMeta = { isArchived: false };

function parseMeta(content: string | Buffer | undefined): EntityMeta {
	if (content === undefined) return NO_META;
	try {
		const json: unknown = jsonParse(content.toString());
		if (!isRecord(json)) return NO_META;
		return {
			...(typeof json.id === 'string' && json.id !== '' ? { id: json.id } : {}),
			...(typeof json.name === 'string' ? { name: json.name } : {}),
			isArchived: json.isArchived === true,
		};
	} catch {
		// An unreadable file keeps the directory name, and import reports the file itself.
		return NO_META;
	}
}

/** What the entity files said, by the Git blob SHA of the file. */
const metaCache = new BlobCache<EntityMeta>(50_000);

/** The id and the name come from the file. Without a readable file, the directory name stands in. */
function deriveEntity(location: EntityLocation, meta: EntityMeta): Derived {
	return {
		collection: location.collection,
		isArchived: meta.isArchived,
		entry: {
			id: meta.id ?? location.id,
			name: meta.name ?? location.slug,
			target: location.target,
		},
	};
}

function toLists(derived: readonly Derived[]): DerivedLists {
	const lists: DerivedLists = {};
	const sorted = derived.toSorted((a, b) => a.entry.target.localeCompare(b.entry.target));
	const variableIds = new Set<string>();
	for (const { collection, entry, isArchived } of sorted) {
		if (collection === 'variables') {
			// A selective push leaves the directory of a renamed variable until the next full push, so two
			// directories can hold one id. The first one stands for it.
			if (variableIds.has(entry.id)) continue;
			variableIds.add(entry.id);
		}
		if (collection === 'workflows') {
			(lists.workflows ??= []).push({ ...entry, isArchived });
		} else {
			(lists[collection] ??= []).push(entry);
		}
	}
	return lists;
}

/** Derives the lists from files that are already in memory. `path` is relative to the package. */
export function deriveLists(
	files: Iterable<[path: string, content: string | Buffer]>,
): DerivedLists {
	const derived: Derived[] = [];
	for (const [path, content] of files) {
		const location = locateEntity(path);
		if (location) derived.push(deriveEntity(location, parseMeta(content)));
	}
	return toLists(derived);
}

/** Puts the lists that the entity files hold into a manifest, replacing any that it carries. */
export function withDerivedLists(manifest: PackageManifest, lists: DerivedLists): PackageManifest {
	return { ...stripDerivedLists(manifest), ...lists };
}

/** Parses a package manifest read from Git. `null` when the file is missing or invalid. */
export function parsePackageManifest(raw: string | undefined): PackageManifest | null {
	let json: unknown;
	try {
		json = jsonParse(raw ?? '');
	} catch {
		return null;
	}
	const manifest = packageManifestSchema.safeParse(json);
	return manifest.success ? manifest.data : null;
}

export type ReadSource = {
	paths: Iterable<string>;
	/** The Git blob SHA of each path, when the listing has it. A file seen before is not read again. */
	blobShaByPath?: ReadonlyMap<string, string>;
	/** Repository paths sit below this folder. */
	prefix?: string;
	readFiles: (paths: string[]) => Promise<ReadonlyMap<string, string>>;
	/** Files that this skips keep the name of their directory. Defaults to every entity file. */
	readsContentOf?: (path: string) => boolean;
};

/**
 * The lists of the entity files in one commit. A file that the commit does not hold keeps the name
 * of its directory.
 */
export async function readDerivedLists({
	paths,
	blobShaByPath,
	prefix = '',
	readFiles,
	readsContentOf = () => true,
}: ReadSource): Promise<DerivedLists> {
	const entities = locateEntities(paths, prefix);
	const metas = new Map<string, EntityMeta>();
	const toRead: string[] = [];
	for (const { path } of entities) {
		const cached = metaCache.get(blobShaByPath?.get(path));
		if (cached) metas.set(path, cached);
		else if (readsContentOf(path)) toRead.push(path);
	}
	// Parse each chunk before the next read, so the contents of a large branch are never all held.
	for (let start = 0; start < toRead.length; start += READ_CHUNK_SIZE) {
		const chunk = toRead.slice(start, start + READ_CHUNK_SIZE);
		for (const [path, content] of await readFiles(chunk)) {
			const meta = parseMeta(content);
			metas.set(path, meta);
			metaCache.set(blobShaByPath?.get(path), meta);
		}
	}
	return toLists(
		entities.map(({ path, location }) => deriveEntity(location, metas.get(path) ?? NO_META)),
	);
}
