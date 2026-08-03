import type { RouteLocationRaw } from 'vue-router';
import { NEW_AGENT_VIEW } from '@/features/agents/constants';
import { INSTANCE_AI_AGENT_ID_QUERY, INSTANCE_AI_PROJECT_ID_QUERY } from './constants';

/**
 * `agentId` lets a caller that reports the click pin the agent the click will
 * eventually produce. Omit it and the new-agent view mints its own.
 */
export function instanceAiCreateAgentRoute(projectId: string, agentId?: string): RouteLocationRaw {
	return {
		name: NEW_AGENT_VIEW,
		query: {
			[INSTANCE_AI_PROJECT_ID_QUERY]: projectId,
			...(agentId ? { [INSTANCE_AI_AGENT_ID_QUERY]: agentId } : {}),
		},
	};
}
