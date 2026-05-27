import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import {
	serializedWorkflowSchema,
	type SerializedWorkflow,
} from '../../spec/serialized/workflow.schema';

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
}
