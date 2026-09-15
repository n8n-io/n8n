import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IConnections, INode } from 'n8n-workflow';

import {
	serializedWorkflowMetadataSchema,
	type SerializedWorkflowMetadata,
} from '../../spec/serialized/workflow-metadata.schema';
import {
	serializedWorkflowSchema,
	type SerializedWorkflow,
} from '../../spec/serialized/workflow.schema';
import { definePackageSerializationPayload } from '../package-serialization.types';
import { compareTagsByName } from '../tag/tag.types';

type WorkflowPackageKeyHandling = {
	id: 'copy';
	createdAt: 'exclude';
	updatedAt: 'exclude';
	name: 'copy';
	description: 'exclude';
	active: 'exclude';
	isArchived: 'copy';
	nodes: 'copy';
	connections: 'copy';
	settings: 'copy';
	staticData: 'exclude';
	meta: 'exclude';
	nodeGroups: 'copy';
	tags: 'transform';
	tagMappings: 'exclude';
	shared: 'exclude';
	pinData: 'exclude';
	versionId: 'copy';
	activeVersionId: 'transform';
	activeVersion: 'exclude';
	versionCounter: 'exclude';
	triggerCount: 'exclude';
	parentFolder: 'transform';
	testRuns: 'exclude';
	sourceWorkflowId: 'exclude';
};

type WorkflowPackageContent = Pick<
	WorkflowEntity,
	'name' | 'nodes' | 'connections' | 'nodeGroups' | 'isArchived' | 'settings'
>;

const serializePayload = definePackageSerializationPayload<
	WorkflowEntity,
	SerializedWorkflow,
	WorkflowPackageKeyHandling
>();

/** The same decisions from the metadata file's side. */
type WorkflowMetadataKeyHandling = Record<
	Exclude<keyof WorkflowPackageKeyHandling, 'activeVersionId'>,
	'exclude'
> & {
	activeVersionId: 'transform';
};

const serializeMetadataPayload = definePackageSerializationPayload<
	WorkflowEntity,
	SerializedWorkflowMetadata,
	WorkflowMetadataKeyHandling
>();

@Service()
export class WorkflowSerializer {
	serialize(workflow: WorkflowEntity, options: { includeTags: boolean }): SerializedWorkflow {
		// Emitted even when empty: on import, a present `tagIds` (incl. `[]`) overwrites
		// taggings to exactly that set, while an absent key leaves them untouched.
		const tags = options.includeTags
			? [...(workflow.tags ?? [])].sort(compareTagsByName)
			: undefined;

		return serializedWorkflowSchema.parse(
			serializePayload({
				id: workflow.id,
				name: workflow.name,
				nodes: workflow.nodes,
				connections: workflow.connections,
				settings: workflow.settings ? { ...workflow.settings } : undefined,
				versionId: workflow.versionId,
				parentFolderId: workflow.parentFolder?.id ?? null,
				isArchived: workflow.isArchived,
				...(workflow.nodeGroups?.length ? { nodeGroups: workflow.nodeGroups } : {}),
				...(tags ? { tagIds: tags.map((tag) => tag.id) } : {}),
			}),
		);
	}

	serializeMetadata(workflow: WorkflowEntity): SerializedWorkflowMetadata {
		return serializedWorkflowMetadataSchema.parse(
			serializeMetadataPayload({ publishedVersionId: workflow.activeVersionId }),
		);
	}

	/**
	 * Turns a workflow from a package back into something we can save on the
	 * target instance. We drop anything the target owns — its id, versionId,
	 * where it lives, timestamps — so the caller can set those fresh.
	 */
	deserialize(wire: SerializedWorkflow): WorkflowPackageContent {
		const parsed = serializedWorkflowSchema.parse(wire);

		return {
			name: parsed.name,
			nodes: parsed.nodes as INode[],
			connections: parsed.connections as IConnections,
			nodeGroups: parsed.nodeGroups ?? [],
			isArchived: parsed.isArchived,
			...(parsed.settings !== undefined ? { settings: parsed.settings } : {}),
		};
	}
}
