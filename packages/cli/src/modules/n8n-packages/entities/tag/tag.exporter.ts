import { type SerializedTag, serializedTagSchema } from '@n8n/api-types';
import type { TagEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import { packageDirectory, writeManifestEntry } from '../../io/manifest-entry';
import type { PackageWriter } from '../../io/package-writer';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageTagRequirement } from '../../spec/requirements.schema';
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

/** The content of a tag file in the package. */
export function serializeTag({ id, name }: { id: string; name: string }): SerializedTag {
	return serializedTagSchema.parse(serializePayload({ id, name }));
}

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
			const requirement: PackageTagRequirement = requirementsByTagId.get(tag.id) ?? {
				id: tag.id,
				name: tag.name,
				usedBy: [],
			};
			if (!requirement.usedBy.some(({ id }) => id === workflowId)) {
				requirement.usedBy.push({ kind: 'workflow', id: workflowId });
			}
			requirementsByTagId.set(tag.id, requirement);
		}

		const requirements = [...requirementsByTagId.values()].sort(compareTagsByName);

		const tagsDir = packageDirectory('tags');
		const entries: ManifestEntry[] = [];

		for (const { id, name } of requirements) {
			entries.push(
				await writeManifestEntry(
					request.writer,
					'tags',
					tagsDir,
					{ id, name },
					serializeTag({ id, name }),
				),
			);
		}

		return { entries, requirements };
	}
}
