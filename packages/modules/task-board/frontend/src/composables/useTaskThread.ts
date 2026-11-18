import type { TaskBoardTaskDetail } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

import { usePolling } from './usePolling';
import { createTaskComment, fetchTask } from '../task-board.api';
import { TASK_BOARD_POLL_INTERVAL_MS } from '../task-board.constants';
import type { TaskRef } from '../task-board.types';

/**
 * Loads the comment thread of the open task, keeps it fresh while the panel is open,
 * and posts comments. A `null` ref means no task is open.
 */
export function useTaskThread(taskRef: MaybeRefOrGetter<TaskRef | null>) {
	const rootStore = useRootStore();
	const toast = useToast();
	const i18n = useI18n();

	const detail = ref<TaskBoardTaskDetail | null>(null);
	const loading = ref(false);
	const posting = ref(false);
	const draft = ref('');

	const comments = computed(() =>
		[...(detail.value?.comments ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
	);

	async function refresh() {
		const target = toValue(taskRef);
		if (!target) return;
		const next = await fetchTask(rootStore.restApiContext, target);
		// The user can open another task while the request is in flight.
		if (toValue(taskRef)?.taskId === target.taskId) detail.value = next;
	}

	async function load() {
		detail.value = null;
		draft.value = '';
		if (!toValue(taskRef)) return;
		loading.value = true;
		try {
			await refresh();
		} catch (error) {
			toast.showError(error, i18n.baseText('taskBoard.thread.loadError'));
		} finally {
			loading.value = false;
		}
	}

	// A failed poll keeps the thread on screen. The next poll tries again.
	usePolling(async () => await refresh().catch(() => {}), {
		intervalMs: TASK_BOARD_POLL_INTERVAL_MS,
		enabled: () => toValue(taskRef) !== null && !loading.value && !posting.value,
	});

	watch(() => toValue(taskRef)?.taskId, load, { immediate: true });

	async function addComment() {
		const target = toValue(taskRef);
		const body = draft.value.trim();
		if (!target || !body || posting.value) return;
		const submitted = draft.value;
		posting.value = true;
		try {
			const comment = await createTaskComment(rootStore.restApiContext, target, { body });
			if (detail.value?.id === target.taskId) {
				detail.value = { ...detail.value, comments: [...detail.value.comments, comment] };
			}
			// Keep text that the user typed while the comment was posted.
			if (draft.value === submitted) draft.value = '';
		} catch (error) {
			toast.showError(error, i18n.baseText('taskBoard.thread.postError'));
		} finally {
			posting.value = false;
		}
	}

	return { detail, comments, loading, posting, draft, addComment };
}
