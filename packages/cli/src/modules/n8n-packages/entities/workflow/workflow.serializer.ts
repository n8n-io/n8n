import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IConnections, INode } from 'n8n-workflow';

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
				isPublished: workflow.activeVersionId === workflow.versionId,
				isArchived: workflow.isArchived,
				...(workflow.nodeGroups?.length ? { nodeGroups: workflow.nodeGroups } : {}),
				...(tags ? { tagIds: tags.map((tag) => tag.id) } : {}),
			}),
		);
	}

	/**
	 * Turns a workflow from a package back into something we can save on
	 * the target instance.
	 *
	 * We drop anything the target owns — its id, versionId, where it lives,
	 * whether it's published, timestamps — so the caller can set those fresh.
	 * The content of the workflow comes along, and we keep whichever
	 * archived state the source had it in.
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
