import { useUsersStore } from '@n8n/stores/users.store';
import { computed } from 'vue';

import { useTaskBoardStore } from '../task-board.store';
import { inboxTasks } from '../task-board.utils';

/** The tasks of the board on screen that wait for a reply from the current user. */
export function useTaskInbox() {
	const store = useTaskBoardStore();
	const usersStore = useUsersStore();

	const tasks = computed(() => inboxTasks(store.board, usersStore.currentUserId));

	return { tasks };
}
