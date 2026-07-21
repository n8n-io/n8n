import type { RouteLocationRaw } from 'vue-router';
import {
	INSTANCE_AI_CREATION_INTENT_AGENT,
	INSTANCE_AI_CREATION_INTENT_QUERY,
	INSTANCE_AI_PROJECT_ID_QUERY,
	INSTANCE_AI_VIEW,
} from './constants';

export function instanceAiCreateAgentRoute(projectId: string): RouteLocationRaw {
	return {
		name: INSTANCE_AI_VIEW,
		query: {
			[INSTANCE_AI_PROJECT_ID_QUERY]: projectId,
			[INSTANCE_AI_CREATION_INTENT_QUERY]: INSTANCE_AI_CREATION_INTENT_AGENT,
		},
	};
}
