import { VIEWS } from '@n8n/frontend-constants/views';
import { getFullApiResponse } from '@n8n/rest-api-client';
import { STICKY_NODE_TYPE } from 'n8n-workflow';

import type { AquariumEntity, EntitySource } from '../aquarium.types';
import { analyzeWorkflow, type AnalyzedNode } from '../engine/design';
import { emptyMetrics, entityKey } from './source.utils';

const MAX_WORKFLOWS = 200;

interface WorkflowListItem {
	id: string;
	name: string;
	nodes?: AnalyzedNode[];
	settings?: unknown;
	createdAt?: string;
	/** Present when the list selects `ownedBy`. */
	homeProject?: { id: string; name: string; type: string } | null;
}

export function toWorkflowEntity(workflow: WorkflowListItem): AquariumEntity {
	const nodeCount = (workflow.nodes ?? []).filter((node) => node.type !== STICKY_NODE_TYPE).length;
	return {
		key: entityKey('workflow', workflow.id),
		id: workflow.id,
		kind: 'workflow',
		name: workflow.name,
		route: { name: VIEWS.WORKFLOW, params: { workflowId: workflow.id } },
		...(workflow.homeProject
			? {
					project: {
						id: workflow.homeProject.id,
						name: workflow.homeProject.name,
						type: workflow.homeProject.type,
					},
				}
			: {}),
		design: analyzeWorkflow(workflow.nodes ?? [], workflow.settings),
		...(workflow.createdAt ? { createdAt: workflow.createdAt } : {}),
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
				select: JSON.stringify(['id', 'name', 'createdAt', 'nodes', 'settings', 'ownedBy']),
				sortBy: 'updatedAt:desc',
				take: MAX_WORKFLOWS,
			},
		);
		return data.map(toWorkflowEntity);
	},
};
