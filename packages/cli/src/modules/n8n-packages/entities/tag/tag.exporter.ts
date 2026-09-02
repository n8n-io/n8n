import type { TagEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import type { PackageWriter } from '../../io/package-writer';
import { createManifestEntry, packageDirectory } from '../../io/manifest-entry';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageTagRequirement } from '../../spec/requirements.schema';
import { serializedTagSchema, type SerializedTag } from '../../spec/serialized/tag.schema';
import { definePackageSerializationPayload } from '../package-serialization.types';
import { compareTagsByName, type WorkflowTagUsage } from './tag.types';

type TagPackageKeyHandling = {
	id: 'copy';
	createdAt: 'exclude';
	updatedAt: 'exclude';
	name: 'copy';
	workflows: 'exclude';
	workflowMappings: 'exclude';
	folderMappings: 'exclude';
};

const serializePayload = definePackageSerializationPayload<
	TagEntity,
	SerializedTag,
	TagPackageKeyHandling
>();

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
	async export(request: TagExportRequest): Promise<TagExportResult> {
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

		const tagsDir = packageDirectory('tags');
		const entries: ManifestEntry[] = [];

		for (const { id, name } of requirements) {
			const entry = createManifestEntry('tags', tagsDir, { id, name });
			const serializedTag = serializedTagSchema.parse(serializePayload({ id, name }));
			await request.writer.writeDirectory(entry.target);
			await request.writer.writeFile(
				`${entry.target}/tag.json`,
				JSON.stringify(serializedTag, null, '\t'),
			);
			entries.push(entry);
		}

		return { entries, requirements };
	}
}
