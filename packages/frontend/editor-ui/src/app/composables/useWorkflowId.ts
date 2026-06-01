import { computed, hasInjectionContext, inject } from 'vue';
import { useRoute, type RouteLocationNormalizedLoaded } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';
import router from '@/app/router';

/**
 * Derive the current workflow id from a route: `'demo'` for demo routes, the
 * `workflowId` route param otherwise, `''` when absent.
 */
function workflowIdFromRoute(route: RouteLocationNormalizedLoaded): string {
	if (route.name === VIEWS.DEMO || route.name === VIEWS.DEMO_DIFF) return 'demo';

	const workflowId = route.params.workflowId;
	return (Array.isArray(workflowId) ? workflowId[0] : workflowId) ?? '';
}

/**
 * Reactive current workflow id, for use in components and composables.
 * Prefers an injected id (provided by the WorkflowLayout tree), otherwise
 * derives it from the route.
 */
export function useWorkflowId() {
	const injectedWorkflowId = hasInjectionContext() ? inject(WorkflowIdKey, null) : null;
	if (injectedWorkflowId) return injectedWorkflowId;

	const route = useRoute();

	return computed(() => workflowIdFromRoute(route));
}

/**
 * Non-reactive equivalent of {@link useWorkflowId} for code that runs outside a
 * Vue setup context — e.g. push connection handlers, which are plain functions
 * invoked imperatively on websocket events and therefore cannot call
 * `useRoute()`. Reads the router singleton so it resolves the exact same
 * "current workflow" that components see via `useWorkflowId()`.
 *
 * Inside a component or composable, use {@link useWorkflowId} instead.
 */
export function getCurrentWorkflowId(): string {
	return workflowIdFromRoute(router.currentRoute.value);
}
