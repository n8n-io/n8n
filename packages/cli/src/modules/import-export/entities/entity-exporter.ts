import type { ExportScope } from '../import-export.types';
import { generateSlug } from '../io/slug.utils';
import type { EntityKey, ManifestEntry } from '../spec/manifest.types';
import type { PackageRequirements } from '../spec/requirements.types';

/**
 * Uniform interface for parallel-phase exporters that don't depend on
 * outputs of any other phase. Sequential-phase exporters (Folder, Workflow)
 * have richer typed signatures and are called directly by the pipeline.
 */
export interface EntityExporter {
	readonly entityKey: EntityKey;
	export(scope: ExportScope): Promise<ManifestEntry[]>;
	/**
	 * Optional. After requirements extraction, the pipeline asks each
	 * exporter to return any *additional* entries that should be included
	 * in the package — e.g. credentials referenced by a workflow but not
	 * picked up because the export wasn't project-scoped.
	 *
	 * Implementations should:
	 *   1. Look at their slice of `requirements`
	 *   2. Filter out anything already in `current`
	 *   3. Fetch and write the missing items, returning the new entries.
	 */
	backfill?(
		requirements: PackageRequirements,
		current: ManifestEntry[],
		scope: ExportScope,
	): Promise<ManifestEntry[]>;
}

/**
 * Shared helper for the common export pattern: generate slug, write directory
 * and JSON file to the archive, return manifest entries.
 *
 * Used by simple resource exporters (credentials, variables, data-tables).
 * Folder and workflow exporters have custom path logic and don't use this.
 */
export function writeEntityFiles<T>(
	items: T[],
	scope: ExportScope,
	options: {
		resourceDir: string;
		filename: string;
		getId: (item: T) => string;
		getName: (item: T) => string;
		serialize: (item: T) => unknown;
	},
): ManifestEntry[] {
	const entries: ManifestEntry[] = [];

	for (const item of items) {
		const id = options.getId(item);
		const name = options.getName(item);
		const slug = generateSlug(name, id);
		const target = `${scope.basePath}/${options.resourceDir}/${slug}`;

		scope.writer.writeDirectory(target);
		scope.writer.writeFile(
			`${target}/${options.filename}`,
			JSON.stringify(options.serialize(item), null, '\t'),
		);

		entries.push({ id, name, target });
	}

	return entries;
}
