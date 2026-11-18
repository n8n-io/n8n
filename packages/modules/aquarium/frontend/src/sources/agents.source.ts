import { AGENT_BUILDER_VIEW } from '@n8n/frontend-constants/agents';
import { getFullApiResponse } from '@n8n/rest-api-client';

import type { AquariumEntity, EntitySource } from '../aquarium.types';
import { emptyMetrics, entityKey } from './source.utils';

const MAX_AGENTS = 100;

interface AgentListItem {
	id: string;
	name: string;
	projectId: string;
	project?: { id: string; name: string; type: string } | null;
	skillVersions?: Record<string, unknown>;
}

export function toAgentEntity(agent: AgentListItem): AquariumEntity {
	return {
		key: entityKey('agent', agent.id),
		id: agent.id,
		kind: 'agent',
		name: agent.name,
		route: { name: AGENT_BUILDER_VIEW, params: { projectId: agent.projectId, agentId: agent.id } },
		...(agent.project
			? { project: { id: agent.project.id, name: agent.project.name, type: agent.project.type } }
			: {}),
		// The list has no tools or run stats. Skills are the only size signal it gives.
		metrics: { ...emptyMetrics(), complexity: 1 + Object.keys(agent.skillVersions ?? {}).length },
	};
}

export const agentsSource: EntitySource = {
	id: 'agents',
	async load({ restApiContext }) {
		const { data } = await getFullApiResponse<AgentListItem[]>(
			restApiContext,
			'GET',
			'/agents/v2',
			{ offset: 0, limit: MAX_AGENTS },
		);
		return data.map(toAgentEntity);
	},
};
