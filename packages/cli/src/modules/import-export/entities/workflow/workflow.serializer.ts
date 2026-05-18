import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';

import type { SerializedWorkflow } from '../../spec/serialized/workflow.serialized';

@Service()
export class WorkflowSerializer {
	serialize(workflow: WorkflowEntity): SerializedWorkflow {
		const serialized: SerializedWorkflow = {
			id: workflow.id,
			name: workflow.name,
			nodes: workflow.nodes,
			connections: workflow.connections,
			versionId: workflow.versionId,
			parentFolderId: workflow.parentFolder?.id ?? null,
			active: workflow.active,
			isArchived: workflow.isArchived,
		};

		if (workflow.settings !== undefined) {
			serialized.settings = workflow.settings;
		}

		return serialized;
	}
}
