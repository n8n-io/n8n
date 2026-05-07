import { Service } from '@n8n/di';
import type { TagEntity } from '@n8n/db';

import { writeEntityFiles } from '../entity-exporter';
import type { ExportScope } from '../../import-export.types';
import type { EntityKey, ManifestEntry } from '../../spec/manifest.types';

import { TagSerializer } from './tag.serializer';

export interface TagExportDeps {
	/** Distinct tags referenced by exported workflows (from WorkflowExporter). */
	referencedTags: TagEntity[];
}

/**
 * Tags are global by `name` in the n8n DB but exported into the package
 * scope so the package is self-describing. The `WorkflowExporter` collects
 * the tags actually referenced and hands them to this exporter.
 */
@Service()
export class TagExporter {
	readonly entityKey: EntityKey = 'tags';

	constructor(private readonly tagSerializer: TagSerializer) {}

	async export(scope: ExportScope, deps: TagExportDeps): Promise<ManifestEntry[]> {
		if (deps.referencedTags.length === 0) return [];

		return writeEntityFiles(deps.referencedTags, scope, {
			resourceDir: 'tags',
			filename: 'tag.json',
			getId: (t) => t.id,
			getName: (t) => t.name,
			serialize: (t) => this.tagSerializer.serialize(t),
		});
	}
}
