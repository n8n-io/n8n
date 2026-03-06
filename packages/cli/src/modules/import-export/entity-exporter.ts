import type { EntityKey, ExportScope, ManifestEntry } from './import-export.types';
import { generateSlug } from './slug.utils';

export interface EntityExporter {
	readonly entityKey: EntityKey;
	export(scope: ExportScope): Promise<ManifestEntry[]>;
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
