// STABLE SEAM. Only this file is allowed to import the public-API workflow /
// credential service-layer modules and WorkflowService. Inputs/outputs are
// typed against @n8n/api-types / parsed shapes. If the public-API DTOs
// change, this file is the one that updates; nothing else in the headless
// code path should need to change.

import type { User } from '@n8n/db';
import { WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';

import type { ParsedWorkflow } from './parse';

import { createWorkflow as publicApiCreateWorkflow } from '@/public-api/v1/handlers/workflows/workflows.service';
import { WorkflowService } from '@/workflows/workflow.service';

export interface CreatedWorkflow {
	id: string;
	name: string;
	parsed: ParsedWorkflow;
}

function parsedToEntity(parsed: ParsedWorkflow): WorkflowEntity {
	return Object.assign(new WorkflowEntity(), {
		name: parsed.name,
		nodes: parsed.nodes,
		connections: parsed.connections,
		settings: parsed.settings ?? {},
		active: false,
	});
}

export const crudAdapter = {
	async createWorkflows(owner: User, parsed: ParsedWorkflow[]): Promise<CreatedWorkflow[]> {
		const created: CreatedWorkflow[] = [];
		for (const wf of parsed) {
			const entity = parsedToEntity(wf);
			const result = await publicApiCreateWorkflow(owner, entity);
			created.push({ id: result.id, name: result.name, parsed: wf });
		}
		return created;
	},

	async activateWorkflow(owner: User, workflowId: string): Promise<void> {
		await Container.get(WorkflowService).activateWorkflow(owner, workflowId, { source: 'api' });
	},
};
