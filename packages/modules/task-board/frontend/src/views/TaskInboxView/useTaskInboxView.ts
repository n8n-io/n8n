import { useTaskInbox } from '../../composables/useTaskInbox';
import { useTaskSelection } from '../../composables/useTaskSelection';

/** The Inbox page: the tasks that wait for the current user, and the one that is open. */
export function useTaskInboxView() {
	const { tasks } = useTaskInbox();
	const { selectedTaskId, selectTask } = useTaskSelection();

	return { tasks, selectedTaskId, selectTask };
}
