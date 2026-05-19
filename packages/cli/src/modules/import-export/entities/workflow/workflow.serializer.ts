import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { SerializableWorkflowSchema, type SerializableWorkflow } from 'n8n-workflow';

@Service()
export class WorkflowSerializer {
	serialize(workflow: WorkflowEntity): SerializableWorkflow {
		return SerializableWorkflowSchema.parse({
			id: workflow.id,
			name: workflow.name,
			nodes: workflow.nodes,
			connections: workflow.connections,
			settings: workflow.settings,
			versionId: workflow.versionId,
			parentFolderId: workflow.parentFolder?.id ?? null,
			active: !!workflow.activeVersionId,
			isArchived: workflow.isArchived,
		});
	}
}
