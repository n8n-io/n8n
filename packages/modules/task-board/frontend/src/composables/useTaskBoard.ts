import type { TaskBoardTask } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { storeToRefs } from 'pinia';
import { onBeforeUnmount, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

import { usePolling } from './usePolling';
import { createTask, fetchTaskBoard, updateTask } from '../task-board.api';
import { TASK_BOARD_POLL_INTERVAL_MS } from '../task-board.constants';
import { useTaskBoardStore } from '../task-board.store';
import type {
	AssigneeChange,
	CreateTaskPayload,
	TaskBoardRef,
	UpdateTaskPayload,
} from '../task-board.types';

/**
 * Loads one board, keeps it fresh while it is on screen, and changes its tasks.
 * Call it once for each board on screen: it owns the polling. `provideActiveTaskBoard` does this.
 */
export function useTaskBoard(boardRef: MaybeRefOrGetter<TaskBoardRef>) {
	const rootStore = useRootStore();
	const store = useTaskBoardStore();
	const toast = useToast();
	const i18n = useI18n();
	const { board } = storeToRefs(store);

	const loading = ref(true);
	const loadFailed = ref(false);
	// Polls that land after a local change would put the old task back for one tick.
	let changeSeq = 0;

	async function refresh() {
		const target = toValue(boardRef);
		const seq = changeSeq;
		const next = await fetchTaskBoard(rootStore.restApiContext, target);
		if (seq !== changeSeq || toValue(boardRef).boardId !== target.boardId) return;
		store.setBoard(next);
		loadFailed.value = false;
	}

	async function load() {
		loading.value = true;
		store.setBoard(null);
		try {
			await refresh();
		} catch (error) {
			loadFailed.value = true;
			toast.showError(error, i18n.baseText('taskBoard.board.loadError'));
		} finally {
			loading.value = false;
		}
	}

	// A failed poll keeps the board on screen. The next poll tries again.
	usePolling(async () => await refresh().catch(() => {}), {
		intervalMs: TASK_BOARD_POLL_INTERVAL_MS,
		enabled: () => !loading.value,
	});

	watch(() => toValue(boardRef).boardId, load, { immediate: true });
	onBeforeUnmount(() => store.setBoard(null));

	async function addTask(payload: CreateTaskPayload): Promise<TaskBoardTask | undefined> {
		changeSeq++;
		try {
			const task = await createTask(rootStore.restApiContext, toValue(boardRef), payload);
			store.upsertTask(task);
			return task;
		} catch (error) {
			toast.showError(error, i18n.baseText('taskBoard.task.createError'));
			return undefined;
		}
	}

	/** Shows the change at once and puts the old task back when the request fails. */
	async function changeTask(taskId: string, payload: UpdateTaskPayload, optimistic: TaskBoardTask) {
		const previous = store.findTask(taskId);
		changeSeq++;
		store.upsertTask(optimistic);
		try {
			const task = await updateTask(
				rootStore.restApiContext,
				{ ...toValue(boardRef), taskId },
				payload,
			);
			store.upsertTask(task);
		} catch (error) {
			if (previous) store.upsertTask(previous);
			toast.showError(error, i18n.baseText('taskBoard.task.updateError'));
		}
	}

	async function moveTask(taskId: string, columnId: string) {
		const task = store.findTask(taskId);
		if (!task || task.columnId === columnId) return;
		await changeTask(taskId, { columnId }, { ...task, columnId });
	}

	async function assignTask(taskId: string, assignee: AssigneeChange, assigneeName: string) {
		const task = store.findTask(taskId);
		if (!task) return;
		const optimistic = assignee ? { ...assignee, name: assigneeName } : null;
		await changeTask(taskId, { assignee }, { ...task, assignee: optimistic });
	}

	return { board, loading, loadFailed, load, addTask, moveTask, assignTask };
}
