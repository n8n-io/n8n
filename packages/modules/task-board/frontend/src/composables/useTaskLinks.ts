import type { RouteLocationRaw } from 'vue-router';

import { useActiveTaskBoard } from './useActiveTaskBoard';
import { TASK_BOARD_TASK_VIEW, TASK_BOARD_VIEW } from '../task-board.constants';

/** The links between the board on screen and the pages of its tasks. */
export function useTaskLinks() {
	const { boardRef } = useActiveTaskBoard();

	/** The page of one task of the board. */
	function taskLocation(taskId: string): RouteLocationRaw {
		return { name: TASK_BOARD_TASK_VIEW, params: { ...boardRef(), taskId } };
	}

	/** The board itself. */
	function boardLocation(): RouteLocationRaw {
		return { name: TASK_BOARD_VIEW, params: boardRef() };
	}

	return { taskLocation, boardLocation };
}
