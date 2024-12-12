<script setup lang="ts" generic="T">
import type { RouteLocationRaw } from 'vue-router';
import TableCell from './TableCell.vue';
import { ElTable, ElTableColumn } from 'element-plus';

/**
 * A reusable table component for displaying test definition data
 * @template T - The type of data being displayed in the table rows
 */

/**
 * Configuration for a table column
 * @template TRow - The type of data in each table row
 */
export type TestDefinitionTableColumn<TRow> = {
	prop: string;
	label: string;
	width?: number;
	sortable?: boolean;
	filters?: Array<{ text: string; value: string }>;
	filterMethod?: (value: string, row: TRow) => boolean;
	route?: (row: TRow) => RouteLocationRaw;
	formatter?: (row: TRow) => string;
};

defineProps<{
	data: T[];
	columns: Array<TestDefinitionTableColumn<T>>;
	showControls?: boolean;
}>();

defineEmits<{
	rowClick: [row: T];
}>();
</script>

<template>
	<div>
		<ElTable
			ref="filterTable"
			:default-sort="{ prop: 'date', order: 'ascending' }"
			:data="data"
			style="width: 100%"
		>
			<ElTableColumn v-for="column in columns" :key="column.prop" v-bind="column">
				<template #default="{ row }">
					<TableCell :column="column" :row="row" @click="$emit('rowClick', row)" />
				</template>
			</ElTableColumn>
		</ElTable>
	</div>
</template>
