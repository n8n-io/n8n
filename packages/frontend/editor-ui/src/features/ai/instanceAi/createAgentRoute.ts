import type { RouteLocationRaw } from 'vue-router';
import { INSTANCE_AI_VIEW, INSTANCE_AI_PROJECT_ID_QUERY } from './constants';

export function instanceAiCreateAgentRoute(projectId: string): RouteLocationRaw {
	return {
		name: INSTANCE_AI_VIEW,
		query: {
			[INSTANCE_AI_PROJECT_ID_QUERY]: projectId,
		},
	};
}
