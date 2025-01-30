<script setup lang="ts" generic="T">
import { useI18n } from '@/composables/useI18n';
import type { TestTableColumn } from './TestTableBase.vue';
import { useRouter } from 'vue-router';

defineProps<{
	column: TestTableColumn<T>;
	row: T;
}>();

defineEmits<{
	click: [];
}>();

const locale = useI18n();
const router = useRouter();
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
	success: 'success',
	cancelled: 'default',
};

const statusLabelMap: Record<string, string> = {
	new: locale.baseText('testDefinition.listRuns.status.new'),
	running: locale.baseText('testDefinition.listRuns.status.running'),
	completed: locale.baseText('testDefinition.listRuns.status.completed'),
	error: locale.baseText('testDefinition.listRuns.status.error'),
	success: locale.baseText('testDefinition.listRuns.status.success'),
	cancelled: locale.baseText('testDefinition.listRuns.status.cancelled'),
};

function hasProperty(row: unknown, prop: string): row is Record<string, unknown> {
	return typeof row === 'object' && row !== null && prop in row;
}

const getCellContent = (column: TestTableColumn<T>, row: T) => {
	if (column.formatter) {
		return column.formatter(row);
	}
	return hasProperty(row, column.prop) ? row[column.prop] : undefined;
};
</script>

<template>
	<div v-if="column.route">
		<a v-if="column.openInNewTab" :href="router.resolve(column.route(row)).href" target="_blank">
			{{ getCellContent(column, row) }}
		</a>
		<router-link v-else :to="column.route(row)">
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
