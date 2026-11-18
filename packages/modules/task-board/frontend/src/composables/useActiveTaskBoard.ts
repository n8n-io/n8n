import { inject, provide, toValue, type InjectionKey, type MaybeRefOrGetter } from 'vue';

import { useAssigneeOptions } from './useAssigneeOptions';
import { useTaskBoard } from './useTaskBoard';
import type { TaskBoardRef } from '../task-board.types';

/** What the pages of a board share: its address, its task actions and its assignee options. */
export type ActiveTaskBoard = Pick<
	ReturnType<typeof useTaskBoard>,
	'addTask' | 'moveTask' | 'assignTask'
> & {
	boardRef: () => TaskBoardRef;
	assignees: ReturnType<typeof useAssigneeOptions>;
};

const activeTaskBoardKey: InjectionKey<ActiveTaskBoard> = Symbol('activeTaskBoard');

/**
 * Loads the board and gives it to the pages below. The pages read the board from the store.
 * They take the actions from here, because the actions share one poll guard.
 */
export function provideActiveTaskBoard(boardRef: MaybeRefOrGetter<TaskBoardRef>) {
	const board = useTaskBoard(boardRef);
	const assignees = useAssigneeOptions(() => toValue(boardRef).projectId || undefined);

	provide(activeTaskBoardKey, {
		boardRef: () => toValue(boardRef),
		addTask: board.addTask,
		moveTask: board.moveTask,
		assignTask: board.assignTask,
		assignees,
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
