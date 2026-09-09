import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IConnections, INode } from 'n8n-workflow';

import {
	serializedWorkflowLifecycleSchema,
	type SerializedWorkflowLifecycle,
} from '../../spec/serialized/workflow-lifecycle.schema';
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
	isArchived: 'transform';
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
	'name' | 'nodes' | 'connections' | 'nodeGroups' | 'settings'
>;

const serializePayload = definePackageSerializationPayload<
	WorkflowEntity,
	SerializedWorkflow,
	WorkflowPackageKeyHandling
>();

/** The same decisions from the lifecycle file's side. */
type WorkflowLifecycleKeyHandling = Record<
	Exclude<keyof WorkflowPackageKeyHandling, 'isArchived' | 'activeVersionId'>,
	'exclude'
> & {
	isArchived: 'copy';
	activeVersionId: 'transform';
};

const serializeLifecyclePayload = definePackageSerializationPayload<
	WorkflowEntity,
	SerializedWorkflowLifecycle,
	WorkflowLifecycleKeyHandling
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
				...(workflow.nodeGroups?.length ? { nodeGroups: workflow.nodeGroups } : {}),
				...(tags ? { tagIds: tags.map((tag) => tag.id) } : {}),
			}),
		);
	}

	serializeLifecycle(workflow: WorkflowEntity): SerializedWorkflowLifecycle {
		return serializedWorkflowLifecycleSchema.parse(
			serializeLifecyclePayload({
				publishedVersionId: workflow.activeVersionId,
				isArchived: workflow.isArchived,
			}),
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
			...(parsed.settings !== undefined ? { settings: parsed.settings } : {}),
		};
	}
}
