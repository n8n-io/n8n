import { computed, hasInjectionContext, inject, type ComputedRef } from 'vue';
import { useRoute } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';

/**
 * Resolves the current workflow id from the route only, ignoring any injected
 * `WorkflowIdKey`.
 *
 * Use this in out-of-tree Pinia stores. A setup store captures `inject()` once,
 * at first instantiation, so resolving via `useWorkflowId()` there risks
 * freezing a shadowed id (e.g. the prop-derived id `WorkflowCanvasHost` provides
 * for an embedded canvas). Reading the route directly keeps the value global and
 * reactive — matching the semantics of the deprecated global
 * `workflowsStore.workflowId` it replaces.
 */
export function useRouteWorkflowId(): ComputedRef<string> {
	const route = useRoute();

	return computed(() => {
		if (route.name === VIEWS.DEMO || route.name === VIEWS.DEMO_DIFF) return 'demo';

		const workflowId = route.params.workflowId;
		return (Array.isArray(workflowId) ? workflowId[0] : workflowId) ?? '';
	});
}

/**
 * Resolves the current workflow id, preferring an injected `WorkflowIdKey`
 * (provided globally by `App.vue`, shadowed by `WorkflowCanvasHost` for embedded
 * canvases) and falling back to the route.
 *
 * Use this in components and in-tree composables, which should honor the
 * injected/shadowed id. Out-of-tree stores should use `useRouteWorkflowId()`.
 */
export function useWorkflowId(): ComputedRef<string> {
	const injectedWorkflowId = hasInjectionContext() ? inject(WorkflowIdKey, null) : null;
	if (injectedWorkflowId) return injectedWorkflowId;

	return useRouteWorkflowId();
}
