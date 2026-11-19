import type { TaskBoardDetail, TaskBoardTask } from '@n8n/api-types';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { groupTasksByColumn, sortColumns } from './task-board.utils';

/**
 * The board on screen. The board view and the task panel both read it, and both change
 * its tasks, so it lives here and not in one composable.
 */
export const useTaskBoardStore = defineStore('taskBoard', () => {
	const board = ref<TaskBoardDetail | null>(null);

	const columns = computed(() => sortColumns(board.value?.columns ?? []));
	const tasksByColumnId = computed(() => groupTasksByColumn(board.value?.tasks ?? []));

	function setBoard(next: TaskBoardDetail | null) {
		board.value = next;
	}

	function findTask(taskId: string): TaskBoardTask | undefined {
		return board.value?.tasks.find((task) => task.id === taskId);
	}

	/** Puts a task that the server returned into the board, in place of its old copy. */
	function upsertTask(task: TaskBoardTask) {
		if (!board.value || board.value.id !== task.boardId) return;
		const others = board.value.tasks.filter((existing) => existing.id !== task.id);
		board.value = { ...board.value, tasks: [...others, task] };
	}

	return { board, columns, tasksByColumnId, setBoard, findTask, upsertTask };
});
