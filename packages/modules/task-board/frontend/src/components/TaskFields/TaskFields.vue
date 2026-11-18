<script setup lang="ts">
import {
	TASK_BOARD_SEVERITIES,
	type TaskBoardColumn,
	type TaskBoardSeverity,
} from '@n8n/api-types';
import { N8nSelect2, type SelectItem, type SelectValue } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import { NO_SEVERITY_VALUE } from '../../task-board.constants';
import { decodeSeverity, encodeSeverity } from '../../task-board.utils';
import TaskFieldRow from '../TaskFieldRow/TaskFieldRow.vue';
import TaskTagsInput from '../TaskTagsInput/TaskTagsInput.vue';

/**
 * The fields of a task that the side column edits: status, assignee, severity and tags.
 * The ticket and the "New task" dialog share it. Without `columns` it has no status row.
 */
const props = defineProps<{
	/** Starts the id and the test id of each control, so two forms can be on one page. */
	idPrefix: string;
	columnId?: string;
	columns?: TaskBoardColumn[];
	assignee: string;
	assigneeItems: SelectItem[];
	severity: TaskBoardSeverity | null;
	tags: string[];
	tagSuggestions: string[];
	disabled?: boolean;
}>();
const emit = defineEmits<{
	move: [columnId: string];
	assign: [value: string];
	'update:severity': [severity: TaskBoardSeverity | null];
	'update:tags': [tags: string[]];
}>();
const i18n = useI18n();

const columnItems = computed<SelectItem[]>(() =>
	(props.columns ?? []).map((column) => ({ value: column.id, label: column.name })),
);

const severityItems = computed<SelectItem[]>(() => [
	{ value: NO_SEVERITY_VALUE, label: i18n.baseText('taskBoard.severity.none') },
	...TASK_BOARD_SEVERITIES.map((severity) => ({
		value: severity,
		label: i18n.baseText(`taskBoard.severity.${severity}`),
	})),
]);

function onMove(value: SelectValue | undefined) {
	if (typeof value === 'string') emit('move', value);
}

function onAssign(value: SelectValue | undefined) {
	if (typeof value === 'string') emit('assign', value);
}

function onSeverity(value: SelectValue | undefined) {
	if (typeof value === 'string') emit('update:severity', decodeSeverity(value));
}
</script>

<template>
	<div :class="$style.fields">
		<TaskFieldRow
			v-if="columns && columnId"
			:label="i18n.baseText('taskBoard.task.status')"
			:input-id="`${idPrefix}-column`"
		>
			<N8nSelect2
				:id="`${idPrefix}-column`"
				:model-value="columnId"
				:items="columnItems"
				:disabled="disabled"
				size="medium"
				:data-test-id="`${idPrefix}-column`"
				@update:model-value="onMove"
			/>
		</TaskFieldRow>
		<TaskFieldRow
			:label="i18n.baseText('taskBoard.task.assignee')"
			:input-id="`${idPrefix}-assignee`"
		>
			<N8nSelect2
				:id="`${idPrefix}-assignee`"
				:model-value="assignee"
				:items="assigneeItems"
				:disabled="disabled"
				size="medium"
				:data-test-id="`${idPrefix}-assignee`"
				@update:model-value="onAssign"
			/>
		</TaskFieldRow>
		<TaskFieldRow
			:label="i18n.baseText('taskBoard.severity.label')"
			:input-id="`${idPrefix}-severity`"
		>
			<N8nSelect2
				:id="`${idPrefix}-severity`"
				:model-value="encodeSeverity(severity)"
				:items="severityItems"
				:disabled="disabled"
				size="medium"
				:data-test-id="`${idPrefix}-severity`"
				@update:model-value="onSeverity"
			/>
		</TaskFieldRow>
		<TaskFieldRow :label="i18n.baseText('taskBoard.tags.label')" :input-id="`${idPrefix}-tags`">
			<TaskTagsInput
				:model-value="tags"
				:suggestions="tagSuggestions"
				:input-id="`${idPrefix}-tags`"
				:disabled="disabled"
				@update:model-value="emit('update:tags', $event)"
			/>
		</TaskFieldRow>
	</div>
</template>

<style lang="scss" module>
.fields {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
</style>
