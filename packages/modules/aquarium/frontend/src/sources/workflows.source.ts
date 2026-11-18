import { VIEWS } from '@n8n/frontend-constants/views';
import { getFullApiResponse } from '@n8n/rest-api-client';
import { STICKY_NODE_TYPE } from 'n8n-workflow';

import type { AquariumEntity, EntitySource } from '../aquarium.types';
import { emptyMetrics, entityKey } from './source.utils';

const MAX_WORKFLOWS = 200;

interface WorkflowListItem {
	id: string;
	name: string;
	nodes?: Array<{ type: string }>;
}

export function toWorkflowEntity(workflow: WorkflowListItem): AquariumEntity {
	const nodeCount = (workflow.nodes ?? []).filter((node) => node.type !== STICKY_NODE_TYPE).length;
	return {
		key: entityKey('workflow', workflow.id),
		id: workflow.id,
		kind: 'workflow',
		name: workflow.name,
		route: { name: VIEWS.WORKFLOW, params: { workflowId: workflow.id } },
		metrics: { ...emptyMetrics(), complexity: nodeCount },
	};
}

export const workflowsSource: EntitySource = {
	id: 'workflows',
	async load({ restApiContext }) {
		const { data } = await getFullApiResponse<WorkflowListItem[]>(
			restApiContext,
			'GET',
			'/workflows',
			{
				filter: { isArchived: false },
				select: JSON.stringify(['id', 'name', 'nodes']),
				sortBy: 'updatedAt:desc',
				take: MAX_WORKFLOWS,
			},
		);
		return data.map(toWorkflowEntity);
	},
};
