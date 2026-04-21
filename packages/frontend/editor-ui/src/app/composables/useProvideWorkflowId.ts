import { computed, provide } from 'vue';
import { useRoute } from 'vue-router';
import { VIEWS } from '@/app/constants';
import { WorkflowIdKey } from '@/app/constants/injectionKeys';

export function useProvideWorkflowId() {
	const route = useRoute();

	const workflowId = computed(() => {
		if (route.name === VIEWS.DEMO) return 'demo';

		const name = route.params.name;
		return (Array.isArray(name) ? name[0] : name) ?? '';
	});

	provide(WorkflowIdKey, workflowId);

	return workflowId;
}
