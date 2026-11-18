import { useUsersStore } from '@n8n/stores/users.store';
import { computed } from 'vue';

import { useTaskBoardStore } from '../task-board.store';
import { inboxTasks } from '../task-board.utils';
import { useProjectResourcePermissions } from './useProjectResourcePermissions';

/** The tasks of the board on screen that wait for a reply from the current user. */
export function useTaskInbox() {
	const store = useTaskBoardStore();
	const usersStore = useUsersStore();
	const { permissionsFor } = useProjectResourcePermissions();

	// A task with no person on it waits for each user who may change the tasks of the board.
	const canEditTasks = computed(
		() => permissionsFor(store.board?.projectId)?.workflow?.update === true,
	);

	const tasks = computed(() =>
		inboxTasks(store.board, usersStore.currentUserId, { includeUnowned: canEditTasks.value }),
	);

	return { tasks };
}
