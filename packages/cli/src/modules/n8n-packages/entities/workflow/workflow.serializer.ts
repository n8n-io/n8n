import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IConnections, INode } from 'n8n-workflow';

import {
	serializedWorkflowSchema,
	type SerializedWorkflow,
} from '../../spec/serialized/workflow.schema';

/** Fields restored from package workflow.json; the target instance assigns the rest. */
type WorkflowPackageContent = Pick<
	WorkflowEntity,
	'name' | 'nodes' | 'connections' | 'isArchived' | 'settings'
>;

@Service()
export class WorkflowSerializer {
	serialize(workflow: WorkflowEntity): SerializedWorkflow {
		return serializedWorkflowSchema.parse({
			id: workflow.id,
			name: workflow.name,
			nodes: workflow.nodes,
			connections: workflow.connections,
			settings: workflow.settings,
			versionId: workflow.versionId,
			parentFolderId: workflow.parentFolder?.id ?? null,
			active: workflow.activeVersionId === workflow.versionId,
			isArchived: workflow.isArchived,
		});
	}

	/**
	 * Turns a workflow from a package back into something we can save on
	 * the target instance.
	 *
	 * We drop anything the target owns — its id, versionId, where it lives,
	 * whether it's active, timestamps — so the caller can set those fresh.
	 * The content of the workflow comes along, and we keep whichever
	 * archived state the source had it in.
	 */
	deserialize(wire: SerializedWorkflow): WorkflowPackageContent {
		// Package JSON uses a looser shape than our runtime types (e.g. connection type is a
		// plain string). Zod already checked the shape and content; these casts are safe type conversions.
		return {
			name: wire.name,
			nodes: wire.nodes as INode[],
			connections: wire.connections as IConnections,
			isArchived: wire.isArchived,
			...(wire.settings !== undefined ? { settings: wire.settings } : {}),
		};
	}
}
