import { Service } from '@n8n/di';

import type { PackageWriter } from '../../io/package-writer';
import { UniqueFilenameAllocator } from '../../io/unique-filename-allocator';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageTagRequirement } from '../../spec/requirements.schema';
import { serializedTagSchema } from '../../spec/serialized/tag.schema';
import type { WorkflowTagUsage } from '../requirements.types';

export interface TagExportRequest {
	usages: WorkflowTagUsage[];
	writer: PackageWriter;
}

export interface TagExportResult {
	entries: ManifestEntry[];
	requirements: PackageTagRequirement[];
}

@Service()
export class TagExporter {
	export(request: TagExportRequest): TagExportResult {
		const tagsById = new Map<string, PackageTagRequirement>();

		for (const { workflowId, tag } of request.usages) {
			const grouped = tagsById.get(tag.id) ?? { id: tag.id, name: tag.name, usedByWorkflows: [] };
			if (!grouped.usedByWorkflows.includes(workflowId)) {
				grouped.usedByWorkflows.push(workflowId);
			}
			tagsById.set(tag.id, grouped);
		}

		const requirements = [...tagsById.values()].sort(
			(a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
		);

		const allocator = new UniqueFilenameAllocator('tags', 'tag');
		const entries: ManifestEntry[] = [];

		for (const tag of requirements) {
			const target = allocator.allocate(tag.name);
			const serialized = serializedTagSchema.parse({ id: tag.id, name: tag.name });
			request.writer.writeDirectory(target);
			request.writer.writeFile(`${target}/tag.json`, JSON.stringify(serialized, null, '\t'));
			entries.push({ id: tag.id, name: tag.name, target });
		}

		return { entries, requirements };
	}
}
