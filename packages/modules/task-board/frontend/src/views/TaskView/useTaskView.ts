import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useTaskLinks } from '../../composables/useTaskLinks';
import { useTaskBoardStore } from '../../task-board.store';

/** The page of one task. The route names the task, and the board on screen holds it. */
export function useTaskView() {
	const route = useRoute();
	const router = useRouter();
	const store = useTaskBoardStore();
	const { board } = storeToRefs(store);
	const { boardLocation } = useTaskLinks();

	const task = computed(() => {
		const { taskId } = route.params;
		return typeof taskId === 'string' ? store.findTask(taskId) : undefined;
	});
	const boardName = computed(() => board.value?.name ?? '');
	const backLocation = computed(() => boardLocation());

	async function backToBoard() {
		await router.push(backLocation.value);
	}

	return { task, boardName, backLocation, backToBoard };
}
