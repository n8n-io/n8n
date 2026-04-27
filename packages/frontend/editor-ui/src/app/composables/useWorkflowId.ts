import { computed, hasInjectionContext, inject } from 'vue';
import { useRoute } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';

export function useWorkflowId() {
	const injectedWorkflowId = hasInjectionContext() ? inject(WorkflowIdKey, null) : null;
	if (injectedWorkflowId) return injectedWorkflowId;

	const route = useRoute();

	return computed(() => {
		if (route.name === VIEWS.DEMO || route.name === VIEWS.DEMO_DIFF) return 'demo';

		const workflowId = route.params.workflowId;
		return (Array.isArray(workflowId) ? workflowId[0] : workflowId) ?? '';
	});
}
