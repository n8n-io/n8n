<script setup lang="ts" generic="T">
import { useI18n } from '@/composables/useI18n';
import type { TestDefinitionTableColumn } from './TestDefinitionTable.vue';

defineProps<{
	column: TestDefinitionTableColumn<T>;
	row: T;
}>();

defineEmits<{
	click: [];
}>();

const locale = useI18n();

interface WithStatus {
	status: string;
}

function hasStatus(row: unknown): row is WithStatus {
	return typeof row === 'object' && row !== null && 'status' in row;
}

const statusThemeMap: Record<string, string> = {
	new: 'info',
	running: 'warning',
	completed: 'success',
	error: 'danger',
};

const statusLabelMap: Record<string, string> = {
	new: locale.baseText('testDefinition.listRuns.status.new'),
	running: locale.baseText('testDefinition.listRuns.status.running'),
	completed: locale.baseText('testDefinition.listRuns.status.completed'),
	error: locale.baseText('testDefinition.listRuns.status.error'),
};

function hasProperty(row: unknown, prop: string): row is Record<string, unknown> {
	return typeof row === 'object' && row !== null && prop in row;
}

const getCellContent = (column: TestDefinitionTableColumn<T>, row: T) => {
	if (column.formatter) {
		return column.formatter(row);
	}
	return hasProperty(row, column.prop) ? row[column.prop] : undefined;
};
</script>

<template>
	<div v-if="column.route">
		<router-link :to="column.route(row)">
			{{ getCellContent(column, row) }}
		</router-link>
	</div>

	<N8nBadge
		v-else-if="column.prop === 'status' && hasStatus(row)"
		:theme="statusThemeMap[row.status]"
		class="mr-4xs"
	>
		{{ statusLabelMap[row.status] }}
	</N8nBadge>

	<div v-else>
		{{ getCellContent(column, row) }}
	</div>
</template>
