import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { TASK_QUERY_PARAM } from '../task-board.constants';

/** The task open in the side panel. It lives in the query, so a link can open it. */
export function useTaskSelection() {
	const route = useRoute();
	const router = useRouter();

	const selectedTaskId = computed(() => {
		const value = route.query[TASK_QUERY_PARAM];
		return typeof value === 'string' && value ? value : undefined;
	});

	function selectTask(taskId: string | undefined) {
		const query = { ...route.query };
		if (taskId) query[TASK_QUERY_PARAM] = taskId;
		else delete query[TASK_QUERY_PARAM];
		void router.replace({ query });
	}

	return { selectedTaskId, selectTask };
}
