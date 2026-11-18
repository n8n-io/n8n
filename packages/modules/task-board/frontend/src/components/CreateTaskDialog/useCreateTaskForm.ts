import type { TaskBoardSeverity } from '@n8n/api-types';
import { computed, ref } from 'vue';

import { UNASSIGNED_VALUE } from '../../task-board.constants';
import type { AssigneeValue, CreateTaskPayload } from '../../task-board.types';
import { decodeAssignee, normalizeTags } from '../../task-board.utils';

/** The values of the "New task" dialog, and the request that they make. */
export function useCreateTaskForm() {
	const title = ref('');
	const description = ref('');
	const assignee = ref<AssigneeValue>(UNASSIGNED_VALUE);
	const severity = ref<TaskBoardSeverity | null>(null);
	const tags = ref<string[]>([]);

	const isValid = computed(() => title.value.trim().length > 0);

	function reset() {
		title.value = '';
		description.value = '';
		assignee.value = UNASSIGNED_VALUE;
		severity.value = null;
		tags.value = [];
	}

	/** The request body. A field that the user left empty is absent, so the backend default applies. */
	function toPayload(): CreateTaskPayload {
		const normalizedTags = normalizeTags(tags.value);
		return {
			title: title.value.trim(),
			description: description.value.trim() || undefined,
			assignee: decodeAssignee(assignee.value) ?? undefined,
			severity: severity.value ?? undefined,
			tags: normalizedTags.length > 0 ? normalizedTags : undefined,
		};
	}

	return { title, description, assignee, severity, tags, isValid, reset, toPayload };
}
