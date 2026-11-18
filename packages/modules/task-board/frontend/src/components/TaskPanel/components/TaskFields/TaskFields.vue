<script setup lang="ts">
import type { TaskBoardColumn } from '@n8n/api-types';
import { N8nInputLabel, N8nSelect2, type SelectItem, type SelectValue } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

const props = defineProps<{
	columnId: string;
	columns: TaskBoardColumn[];
	assignee: string;
	assigneeItems: SelectItem[];
}>();
const emit = defineEmits<{ move: [columnId: string]; assign: [value: string] }>();
const i18n = useI18n();

const columnItems = computed<SelectItem[]>(() =>
	props.columns.map((column) => ({ value: column.id, label: column.name })),
);

function onMove(value: SelectValue | undefined) {
	if (typeof value === 'string') emit('move', value);
}

function onAssign(value: SelectValue | undefined) {
	if (typeof value === 'string') emit('assign', value);
}
</script>

<template>
	<div :class="$style.fields">
		<N8nInputLabel
			:label="i18n.baseText('taskBoard.task.column')"
			input-name="task-board-task-column"
			size="small"
		>
			<N8nSelect2
				id="task-board-task-column"
				:model-value="columnId"
				:items="columnItems"
				size="medium"
				data-test-id="task-board-task-column"
				@update:model-value="onMove"
			/>
		</N8nInputLabel>
		<N8nInputLabel
			:label="i18n.baseText('taskBoard.task.assignee')"
			input-name="task-board-task-assignee"
			size="small"
		>
			<N8nSelect2
				id="task-board-task-assignee"
				:model-value="assignee"
				:items="assigneeItems"
				size="medium"
				data-test-id="task-board-task-assignee"
				@update:model-value="onAssign"
			/>
		</N8nInputLabel>
	</div>
</template>

<style lang="scss" module>
.fields {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--sm);
}
</style>
