import type { RouteLocationRaw } from 'vue-router';
import { NEW_AGENT_VIEW } from '@/features/agents/constants';
import { INSTANCE_AI_PROJECT_ID_QUERY } from './constants';

export function instanceAiCreateAgentRoute(projectId: string): RouteLocationRaw {
	return {
		name: NEW_AGENT_VIEW,
		query: {
			[INSTANCE_AI_PROJECT_ID_QUERY]: projectId,
		},
	};
}
