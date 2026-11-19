import { computed } from 'vue';
import { useRouter } from 'vue-router';

import { useTaskLinks } from '../../composables/useTaskLinks';
import { useTaskSelection } from '../../composables/useTaskSelection';
import { useTaskBoardStore } from '../../task-board.store';

/** The task in the side panel of a board page, and the way from the panel to the task page. */
export function useTaskPanel() {
	const store = useTaskBoardStore();
	const router = useRouter();
	const { taskLocation } = useTaskLinks();
	const { selectedTaskId, selectTask } = useTaskSelection();

	const selectedTask = computed(() =>
		selectedTaskId.value ? store.findTask(selectedTaskId.value) : undefined,
	);
	const selectedTaskLocation = computed(() =>
		selectedTaskId.value ? taskLocation(selectedTaskId.value) : undefined,
	);

	function close() {
		selectTask(undefined);
	}

	async function openFullPage() {
		if (selectedTaskLocation.value) await router.push(selectedTaskLocation.value);
	}

	return { selectedTask, selectedTaskLocation, close, openFullPage };
}
