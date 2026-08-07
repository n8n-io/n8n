import { Service } from '@n8n/di';

import type { PackageWriter } from '../../io/package-writer';
import { UniqueFilenameAllocator } from '../../io/unique-filename-allocator';
import type { PathStyle } from '../../n8n-packages.types';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageTagRequirement } from '../../spec/requirements.schema';
import { serializedTagSchema } from '../../spec/serialized/tag.schema';
import { compareTagsByName, type WorkflowTagUsage } from './tag.types';

export interface TagExportRequest {
	usages: WorkflowTagUsage[];
	writer: PackageWriter;
	pathStyle?: PathStyle;
}

export interface TagExportResult {
	entries: ManifestEntry[];
	requirements: PackageTagRequirement[];
}

@Service()
export class TagExporter {
	export(request: TagExportRequest): TagExportResult {
		const requirementsByTagId = new Map<string, PackageTagRequirement>();

		for (const { workflowId, tag } of request.usages) {
			const requirement = requirementsByTagId.get(tag.id) ?? {
				id: tag.id,
				name: tag.name,
				usedByWorkflows: [],
			};
			if (!requirement.usedByWorkflows.includes(workflowId)) {
				requirement.usedByWorkflows.push(workflowId);
			}
			requirementsByTagId.set(tag.id, requirement);
		}

		const requirements = [...requirementsByTagId.values()].sort(compareTagsByName);

		const allocator = new UniqueFilenameAllocator('tags', 'tag', request.pathStyle);
		const entries: ManifestEntry[] = [];

		for (const { id, name } of requirements) {
			const tagDirectory = allocator.allocate(name, id);
			const serializedTag = serializedTagSchema.parse({ id, name });
			request.writer.writeDirectory(tagDirectory);
			request.writer.writeFile(
				`${tagDirectory}/tag.json`,
				JSON.stringify(serializedTag, null, '\t'),
			);
			entries.push({ id, name, target: tagDirectory });
		}

		return { entries, requirements };
	}
}
