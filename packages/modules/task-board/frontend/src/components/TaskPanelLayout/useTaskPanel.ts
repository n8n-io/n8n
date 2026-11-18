import { storeToRefs } from 'pinia';
import { computed } from 'vue';

import { useActiveTaskBoard } from '../../composables/useActiveTaskBoard';
import { useTaskSelection } from '../../composables/useTaskSelection';
import { useTaskBoardStore } from '../../task-board.store';
import { decodeAssignee } from '../../task-board.utils';

/** The task in the side panel of a board page, and the changes the panel makes to it. */
export function useTaskPanel() {
	const store = useTaskBoardStore();
	const { columns } = storeToRefs(store);
	const { boardRef, moveTask, assignTask, assignees } = useActiveTaskBoard();
	const { selectedTaskId, selectTask } = useTaskSelection();

	const projectId = computed(() => boardRef().projectId);
	const selectedTask = computed(() =>
		selectedTaskId.value ? store.findTask(selectedTaskId.value) : undefined,
	);
	const assigneeItems = computed(() => assignees.itemsFor(selectedTask.value?.assignee ?? null));

	function close() {
		selectTask(undefined);
	}

	async function move(columnId: string) {
		if (selectedTaskId.value) await moveTask(selectedTaskId.value, columnId);
	}

	async function assign(value: string) {
		if (!selectedTaskId.value) return;
		await assignTask(selectedTaskId.value, decodeAssignee(value), assignees.labelFor(value));
	}

	return { projectId, columns, selectedTask, assigneeItems, close, move, assign };
}
