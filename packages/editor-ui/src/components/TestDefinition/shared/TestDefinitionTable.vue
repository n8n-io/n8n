<script setup lang="ts" generic="T">
import type { RouteLocationRaw } from 'vue-router';
import TableCell from './TableCell.vue';
import { ElTable, ElTableColumn } from 'element-plus';
import { ref } from 'vue';
import type { TableInstance } from 'element-plus';

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
	openInNewTab?: boolean;
	formatter?: (row: TRow) => string;
};

withDefaults(
	defineProps<{
		data: T[];
		columns: Array<TestDefinitionTableColumn<T>>;
		showControls?: boolean;
		defaultSort?: { prop: string; order: 'ascending' | 'descending' };
		selectable?: boolean;
		selectableFilter?: (row: T) => boolean;
	}>(),
	{
		defaultSort: () => ({ prop: 'date', order: 'ascending' }),
		selectable: false,
		selectableFilter: () => true,
	},
);

const tableRef = ref<TableInstance>();
const selectedRows = ref<T[]>([]);

const emit = defineEmits<{
	rowClick: [row: T];
	selectionChange: [rows: T[]];
}>();

const handleSelectionChange = (rows: T[]) => {
	selectedRows.value = rows;
	emit('selectionChange', rows);
};
</script>

<template>
	<ElTable
		ref="tableRef"
		:default-sort="defaultSort"
		:data="data"
		style="width: 100%"
		:border="true"
		max-height="800"
		resizable
		@selection-change="handleSelectionChange"
	>
		<ElTableColumn
			v-if="selectable"
			type="selection"
			:selectable="selectableFilter"
			width="55"
			data-test-id="table-column-select"
		/>
		<ElTableColumn
			v-for="column in columns"
			:key="column.prop"
			v-bind="column"
			style="width: 100%"
			:resizable="true"
			data-test-id="table-column"
		>
			<template #default="{ row }">
				<TableCell
					:column="column"
					:row="row"
					@click="$emit('rowClick', row)"
					data-test-id="table-cell"
				/>
			</template>
		</ElTableColumn>
	</ElTable>
</template>
