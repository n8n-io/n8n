import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';

import { useActiveTaskBoard } from '../../composables/useActiveTaskBoard';
import { useTaskLinks } from '../../composables/useTaskLinks';
import { useTaskSelection } from '../../composables/useTaskSelection';
import { TAG_SUGGESTION_LIMIT } from '../../task-board.constants';
import { useTaskBoardStore } from '../../task-board.store';
import type { CreateTaskPayload } from '../../task-board.types';
import { suggestTags } from '../../task-board.utils';

/** The Issues page: the columns of the board, and the "New task" dialog. */
export function useTaskBoardView() {
	const { board, columns, tasksByColumnId } = storeToRefs(useTaskBoardStore());
	const { addTask, moveTask, assignees } = useActiveTaskBoard();
	const { selectedTaskId, selectTask } = useTaskSelection();
	const { taskLocation } = useTaskLinks();

	const tagSuggestions = computed(() =>
		suggestTags(board.value?.tasks ?? [], [], TAG_SUGGESTION_LIMIT),
	);

	const createDialogOpen = ref(false);
	const creatingTask = ref(false);

	async function createTask(payload: CreateTaskPayload) {
		creatingTask.value = true;
		try {
			const task = await addTask(payload);
			if (!task) return;
			createDialogOpen.value = false;
			selectTask(task.id);
		} finally {
			creatingTask.value = false;
		}
	}

	return {
		board,
		columns,
		tasksByColumnId,
		assigneeItems: assignees.items,
		tagSuggestions,
		taskLocation,
		selectedTaskId,
		selectTask,
		moveTask,
		createDialogOpen,
		creatingTask,
		createTask,
	};
}
