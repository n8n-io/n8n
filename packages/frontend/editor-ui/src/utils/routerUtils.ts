import type { RouteLocationNormalizedLoaded } from 'vue-router';

export function isNewWorkflowRoute(route: RouteLocationNormalizedLoaded): boolean {
	return 'new' in route.query;
}
