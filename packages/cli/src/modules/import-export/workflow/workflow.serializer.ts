import { Service } from '@n8n/di';
import type { WorkflowEntity } from '@n8n/db';

import type { Serializer } from '../serializer';
import type { SerializedWorkflow } from './workflow.types';

@Service()
export class WorkflowSerializer implements Serializer<WorkflowEntity, SerializedWorkflow> {
	serialize(workflow: WorkflowEntity): SerializedWorkflow {
		const serialized: SerializedWorkflow = {
			id: workflow.id,
			name: workflow.name,
			nodes: workflow.nodes,
			connections: workflow.connections,
			versionId: workflow.versionId,
			parentFolderId: workflow.parentFolder?.id ?? null,
			isArchived: workflow.isArchived,
		};

		if (workflow.settings !== undefined) {
			serialized.settings = workflow.settings;
		}

		return serialized;
	}
}
