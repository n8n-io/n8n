import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IConnections, INode } from 'n8n-workflow';

import {
	serializedWorkflowSchema,
	type SerializedWorkflow,
} from '../../spec/serialized/workflow.schema';
import { compareTagsByName } from '../tag/tag.types';

type WorkflowEntityDataKey = {
	[K in keyof WorkflowEntity]-?: WorkflowEntity[K] extends (...args: never[]) => unknown
		? never
		: K;
}[keyof WorkflowEntity];

// `copy` writes and restores the same field. `transform` uses the field in the package
// without restoring it directly (for example, tags become tagIds). `exclude` omits it.
type WorkflowPackageDecision = 'copy' | 'transform' | 'exclude';

const workflowPackagePolicy = {
	id: 'transform',
	createdAt: 'exclude',
	updatedAt: 'exclude',
	name: 'copy',
	description: 'exclude',
	active: 'exclude',
	isArchived: 'copy',
	nodes: 'copy',
	connections: 'copy',
	settings: 'copy',
	staticData: 'exclude',
	meta: 'exclude',
	nodeGroups: 'exclude',
	tags: 'transform',
	tagMappings: 'exclude',
	shared: 'exclude',
	pinData: 'exclude',
	versionId: 'transform',
	activeVersionId: 'transform',
	activeVersion: 'exclude',
	versionCounter: 'exclude',
	triggerCount: 'exclude',
	parentFolder: 'transform',
	testRuns: 'exclude',
	sourceWorkflowId: 'exclude',
} as const satisfies Record<WorkflowEntityDataKey, WorkflowPackageDecision>;

type WorkflowPackageContentKey = {
	[K in keyof typeof workflowPackagePolicy]-?: (typeof workflowPackagePolicy)[K] extends 'copy'
		? K
		: never;
}[keyof typeof workflowPackagePolicy];

type WorkflowPackageContent = Pick<WorkflowEntity, WorkflowPackageContentKey>;

@Service()
export class WorkflowSerializer {
	serialize(workflow: WorkflowEntity, options: { includeTags: boolean }): SerializedWorkflow {
		// Emitted even when empty: on import, a present `tagIds` (incl. `[]`) overwrites
		// taggings to exactly that set, while an absent key leaves them untouched.
		const tags = options.includeTags
			? [...(workflow.tags ?? [])].sort(compareTagsByName)
			: undefined;

		return serializedWorkflowSchema.parse({
			id: workflow.id,
			name: workflow.name,
			nodes: workflow.nodes,
			connections: workflow.connections,
			settings: workflow.settings,
			versionId: workflow.versionId,
			parentFolderId: workflow.parentFolder?.id ?? null,
			isPublished: workflow.activeVersionId === workflow.versionId,
			isArchived: workflow.isArchived,
			...(tags ? { tagIds: tags.map((tag) => tag.id) } : {}),
		});
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
			isArchived: parsed.isArchived,
			...(parsed.settings !== undefined ? { settings: parsed.settings } : {}),
		};
	}
}
