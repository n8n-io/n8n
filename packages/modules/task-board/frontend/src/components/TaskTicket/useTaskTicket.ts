import type { TaskBoardSeverity, TaskBoardTask } from '@n8n/api-types';
import { storeToRefs } from 'pinia';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';

import { useActiveTaskBoard } from '../../composables/useActiveTaskBoard';
import { useTaskThread } from '../../composables/useTaskThread';
import { TAG_SUGGESTION_LIMIT } from '../../task-board.constants';
import { useTaskBoardStore } from '../../task-board.store';
import type { TaskEdit } from '../../task-board.types';
import {
	decodeAssignee,
	encodeAssignee,
	isAgentWorking,
	sameTags,
	suggestTags,
} from '../../task-board.utils';

/**
 * One task of the board on screen: its comment thread, what the side column shows, and the
 * changes that the user makes in place. The side panel and the task page share it.
 */
export function useTaskTicket(task: MaybeRefOrGetter<TaskBoardTask>) {
	const { board, columns } = storeToRefs(useTaskBoardStore());
	const { boardRef, moveTask, assignTask, editTask, assignees, canEditTasks } =
		useActiveTaskBoard();

	const thread = useTaskThread(() => ({ ...boardRef(), taskId: toValue(task).id }));

	const column = computed(() =>
		columns.value.find((candidate) => candidate.id === toValue(task).columnId),
	);
	const working = computed(() => isAgentWorking(toValue(task), column.value));
	const assignee = computed(() => encodeAssignee(toValue(task).assignee));
	const assigneeItems = computed(() => assignees.itemsFor(toValue(task).assignee));
	const tagSuggestions = computed(() =>
		suggestTags(board.value?.tasks ?? [], toValue(task).tags, TAG_SUGGESTION_LIMIT),
	);
	const usageByAgent = computed(() => thread.detail.value?.usageByAgent ?? []);

	async function edit(change: TaskEdit) {
		if (canEditTasks.value) await editTask(toValue(task).id, change);
	}

	async function move(columnId: string) {
		if (canEditTasks.value) await moveTask(toValue(task).id, columnId);
	}

	async function assign(value: string) {
		if (!canEditTasks.value || value === assignee.value) return;
		await assignTask(toValue(task).id, decodeAssignee(value), assignees.labelFor(value));
	}

	async function rename(title: string) {
		await edit({ title });
	}

	async function describe(description: string) {
		await edit({ description });
	}

	async function setSeverity(severity: TaskBoardSeverity | null) {
		if (severity !== toValue(task).severity) await edit({ severity });
	}

	/** The tags input sends the tags in their normalized form. */
	async function setTags(tags: string[]) {
		if (!sameTags(tags, toValue(task).tags)) await edit({ tags });
	}

	return {
		comments: thread.comments,
		loading: thread.loading,
		posting: thread.posting,
		draft: thread.draft,
		addComment: thread.addComment,
		canEdit: canEditTasks,
		columns,
		column,
		working,
		assignee,
		assigneeItems,
		tagSuggestions,
		usageByAgent,
		move,
		assign,
		rename,
		describe,
		setSeverity,
		setTags,
	};
}
