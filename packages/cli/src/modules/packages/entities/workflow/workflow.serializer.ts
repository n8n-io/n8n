import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import {
	serializedWorkflowSchema,
	type SerializedWorkflow,
} from '../../spec/serialized/workflow.schema';

@Service()
export class WorkflowSerializer {
	serialize(workflow: WorkflowEntity): SerializedWorkflow {
		// Parsing through the schema strips unknown fields, so anything added to
		// WorkflowEntity that isn't part of the .n8np format won't leak into the
		// archive. Throws if the workflow's stored shape is invalid.
		return serializedWorkflowSchema.parse({
			id: workflow.id,
			name: workflow.name,
			nodes: workflow.nodes,
			connections: workflow.connections,
			settings: workflow.settings,
			versionId: workflow.versionId,
			parentFolderId: workflow.parentFolder?.id ?? null,
			active: workflow.active,
			isArchived: workflow.isArchived,
		});
	}
}
