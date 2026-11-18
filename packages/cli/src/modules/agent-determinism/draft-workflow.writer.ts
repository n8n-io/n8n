import { WorkflowEntity, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { WorkflowJSON } from '@n8n/workflow-sdk';

import { NodeTypes } from '@/node-types';
import { TagService } from '@/services/tag.service';
import { resolveNodeWebhookIds } from '@/workflow-helpers';
import { WorkflowCreationService } from '@/workflows/workflow-creation.service';

import { DRAFT_NAME_SUFFIX, DRAFT_TAG_NAME } from './agent-determinism.constants';
import type { DeterminismSource } from './agent-determinism.contracts';

@Service()
export class DraftWorkflowWriter {
	constructor(
		private readonly workflowCreationService: WorkflowCreationService,
		private readonly tagService: TagService,
		private readonly nodeTypes: NodeTypes,
	) {}

	async write(actor: User, source: DeterminismSource, draft: WorkflowJSON) {
		const entity = new WorkflowEntity();
		Object.assign(entity, {
			name: `${source.name} ${DRAFT_NAME_SUFFIX}`,
			nodes: draft.nodes,
			connections: draft.connections,
			settings: { ...draft.settings, executionOrder: 'v1' },
			meta: {
				generatedFrom: { type: source.type, id: source.id, versionHash: source.versionHash },
			},
		});
		resolveNodeWebhookIds(entity, this.nodeTypes);

		const tags = await this.tagService.findOrCreateByNames([DRAFT_TAG_NAME]);
		return await this.workflowCreationService.createWorkflow(actor, entity, {
			projectId: source.projectId,
			tagIds: tags.map((tag) => tag.id),
		});
	}
}
