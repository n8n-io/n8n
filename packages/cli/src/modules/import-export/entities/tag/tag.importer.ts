import { Service } from '@n8n/di';
import { TagEntity, TagRepository } from '@n8n/db';
import { jsonParse } from 'n8n-workflow';

import type { ImportScope } from '../../import-export.types';
import type { EntityKey, ManifestEntry } from '../../spec/manifest.types';
import type { SerializedTag } from '../../spec/serialized/tag.serialized';

export interface TagImportResult {
	/**
	 * Source tag ID → resolved target tag (id + name). Consumed by
	 * WorkflowImporter so it can pass `{ id, name }` shapes through to
	 * `ImportService.importWorkflows` (matched on by name in `setTags`).
	 */
	tagsBySourceId: Map<string, { id: string; name: string }>;
}

/**
 * Imports tag entries from the package. Tags are *globally* unique by name
 * in the n8n DB, so an existing tag with the same name is reused. Otherwise
 * a new tag is created. Returns a source ID → target tag map for the
 * workflow importer to remap each workflow's tag references.
 */
@Service()
export class TagImporter {
	readonly entityKey: EntityKey = 'tags';

	constructor(private readonly tagRepository: TagRepository) {}

	async import(scope: ImportScope, entries: ManifestEntry[]): Promise<TagImportResult> {
		const tagsBySourceId = new Map<string, { id: string; name: string }>();
		if (entries.length === 0) return { tagsBySourceId };

		const repo = scope.entityManager?.getRepository(TagEntity) ?? this.tagRepository;

		for (const entry of entries) {
			const content = scope.reader.readFile(`${entry.target}/tag.json`);
			const tag: SerializedTag = jsonParse(content);

			const existing = await repo.findOne({ where: { name: tag.name } });
			if (existing) {
				tagsBySourceId.set(tag.id, { id: existing.id, name: existing.name });
				continue;
			}

			const created = repo.create({ name: tag.name });
			const saved = await repo.save(created);
			tagsBySourceId.set(tag.id, { id: saved.id, name: saved.name });
		}

		return { tagsBySourceId };
	}
}
