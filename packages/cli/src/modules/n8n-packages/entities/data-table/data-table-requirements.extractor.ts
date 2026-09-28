import type { WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { DATA_TABLE_NODE_TYPES } from 'n8n-workflow';

import type { WorkflowDataTableRequirement } from './data-table.types';
import type { RequirementsExtractor } from '../requirements-extractor';

@Service()
export class DataTableRequirementsExtractor
	implements RequirementsExtractor<WorkflowDataTableRequirement>
{
	extract(workflow: WorkflowEntity): WorkflowDataTableRequirement[] {
		const byId = new Map<string, WorkflowDataTableRequirement>();

		for (const node of workflow.nodes ?? []) {
			if (!DATA_TABLE_NODE_TYPES.includes(node.type)) continue;

			const resourceLocator = node.parameters?.dataTableId as
				| { mode?: string; value?: string }
				| undefined;

			// Only 'id'/'list' modes carry the table id directly; 'name' mode stores a
			// name (would need name→id resolution) and expressions can't be resolved statically.
			if (
				!resourceLocator?.value ||
				typeof resourceLocator.value !== 'string' ||
				resourceLocator.mode === 'name' ||
				resourceLocator.value.includes('{') ||
				byId.has(resourceLocator.value)
			) {
				continue;
			}

			byId.set(resourceLocator.value, {
				workflowId: workflow.id,
				dataTableId: resourceLocator.value,
			});
		}

		return [...byId.values()];
	}
}
