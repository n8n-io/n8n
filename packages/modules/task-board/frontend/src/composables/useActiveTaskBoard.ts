import {
	computed,
	inject,
	provide,
	toValue,
	type ComputedRef,
	type InjectionKey,
	type MaybeRefOrGetter,
} from 'vue';

import { useAssigneeOptions } from './useAssigneeOptions';
import { useProjectResourcePermissions } from './useProjectResourcePermissions';
import { useTaskBoard } from './useTaskBoard';
import type { TaskBoardRef } from '../task-board.types';

/** What the pages of a board share: its address, its task actions and its assignee options. */
export type ActiveTaskBoard = Pick<
	ReturnType<typeof useTaskBoard>,
	'addTask' | 'moveTask' | 'assignTask' | 'editTask'
> & {
	/** Loads the board again, for a change that the task actions do not cover. */
	refreshBoard: () => Promise<void>;
	boardRef: () => TaskBoardRef;
	assignees: ReturnType<typeof useAssigneeOptions>;
	/** True when the user may change the tasks of the board. */
	canEditTasks: ComputedRef<boolean>;
};

const activeTaskBoardKey: InjectionKey<ActiveTaskBoard> = Symbol('activeTaskBoard');

/**
 * Loads the board and gives it to the pages below. The pages read the board from the store.
 * They take the actions from here, because the actions share one poll guard.
 */
export function provideActiveTaskBoard(boardRef: MaybeRefOrGetter<TaskBoardRef>) {
	const board = useTaskBoard(boardRef);
	const assignees = useAssigneeOptions(
		() => toValue(boardRef).projectId || undefined,
		() => board.board.value?.agentIds ?? [],
	);
	const { permissionsFor } = useProjectResourcePermissions();

	// The task endpoints of the backend need the workflow update scope.
	const canEditTasks = computed(
		() => permissionsFor(toValue(boardRef).projectId)?.workflow?.update === true,
	);

	provide(activeTaskBoardKey, {
		boardRef: () => toValue(boardRef),
		addTask: board.addTask,
		moveTask: board.moveTask,
		assignTask: board.assignTask,
		editTask: board.editTask,
		refreshBoard: board.refresh,
		assignees,
		canEditTasks,
	});

	return {
		board: board.board,
		loading: board.loading,
		loadFailed: board.loadFailed,
		reload: board.load,
	};
}

export function useActiveTaskBoard(): ActiveTaskBoard {
	const active = inject(activeTaskBoardKey);
	if (!active) throw new Error('No task board is provided. Render the page in ActiveTaskBoard.');
	return active;
}
