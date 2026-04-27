import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { VIEWS } from '@/app/constants';

export function useWorkflowId() {
	const route = useRoute();

	return computed(() => {
		if (route.name === VIEWS.DEMO || route.name === VIEWS.DEMO_DIFF) return 'demo';

		const workflowId = route.params.workflowId;
		return (Array.isArray(workflowId) ? workflowId[0] : workflowId) ?? '';
	});
}
