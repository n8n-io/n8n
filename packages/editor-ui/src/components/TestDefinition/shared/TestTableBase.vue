<script setup lang="ts" generic="T extends object">
import type { RouteLocationRaw } from 'vue-router';
import TableCell from './TableCell.vue';
import { ElTable, ElTableColumn } from 'element-plus';
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import type { TableInstance } from 'element-plus';
import { isEqual } from 'lodash-es';
/**
 * A reusable table component for displaying evaluation results data
 * @template T - The type of data being displayed in the table rows
 */

/**
 * Configuration for a table column
 * @template TRow - The type of data in each table row
 */
export type TestTableColumn<TRow> = {
	prop: string;
	label: string;
	width?: number;
	sortable?: boolean;
	filters?: Array<{ text: string; value: string }>;
	filterMethod?: (value: string, row: TRow) => boolean;
	route?: (row: TRow) => RouteLocationRaw;
	sortMethod?: (a: TRow, b: TRow) => number;
	openInNewTab?: boolean;
	formatter?: (row: TRow) => string;
};

type TableRow = T & { id: string };

const MIN_TABLE_HEIGHT = 350;
const MAX_TABLE_HEIGHT = 1400;
const props = withDefaults(
	defineProps<{
		data: TableRow[];
		columns: Array<TestTableColumn<TableRow>>;
		showControls?: boolean;
		defaultSort?: { prop: string; order: 'ascending' | 'descending' };
		selectable?: boolean;
		selectableFilter?: (row: TableRow) => boolean;
	}>(),
	{
		defaultSort: () => ({ prop: 'date', order: 'descending' }),
		selectable: false,
		selectableFilter: () => true,
	},
);

const tableRef = ref<TableInstance>();
const selectedRows = ref<TableRow[]>([]);
const localData = ref<TableRow[]>([]);
const tableHeight = ref<string>('100%');
const emit = defineEmits<{
	rowClick: [row: TableRow];
	selectionChange: [rows: TableRow[]];
}>();

// Watch for changes to the data prop and update the local data state
// This preserves selected rows when the data changes by:
// 1. Storing current selection IDs
// 2. Updating local data with new data
// 3. Re-applying default sort
// 4. Re-selecting previously selected rows that still exist in new data
watch(
	() => props.data,
	async (newData) => {
		if (!isEqual(localData.value, newData)) {
			const currentSelectionIds = selectedRows.value.map((row) => row.id);

			localData.value = newData;
			await nextTick();

			tableRef.value?.sort(props.defaultSort.prop, props.defaultSort.order);
			currentSelectionIds.forEach((id) => {
				const row = localData.value.find((r) => r.id === id);
				if (row) {
					tableRef.value?.toggleRowSelection(row, true);
				}
			});
		}
	},
	{ immediate: true, deep: true },
);

const handleSelectionChange = (rows: TableRow[]) => {
	selectedRows.value = rows;
	emit('selectionChange', rows);
};

const computeTableHeight = () => {
	const containerHeight = tableRef.value?.$el?.parentElement?.clientHeight ?? 600;
	const height = Math.min(Math.max(containerHeight, MIN_TABLE_HEIGHT), MAX_TABLE_HEIGHT);
	tableHeight.value = `${height - 100}px`;
};

onMounted(() => {
	computeTableHeight();

	window.addEventListener('resize', computeTableHeight);
});

onUnmounted(() => {
	window.removeEventListener('resize', computeTableHeight);
});
</script>

<template>
	<ElTable
		ref="tableRef"
		:class="$style.table"
		:default-sort="defaultSort"
		:data="localData"
		:border="true"
		:max-height="tableHeight"
		resizable
		@selection-change="handleSelectionChange"
		@vue:mounted="computeTableHeight"
	>
		<ElTableColumn
			v-if="selectable"
			type="selection"
			:selectable="selectableFilter"
			data-test-id="table-column-select"
		/>
		<ElTableColumn
			v-for="column in columns"
			:key="column.prop"
			v-bind="column"
			:resizable="true"
			data-test-id="table-column"
		>
			<template #default="{ row }">
				<TableCell
					:key="row.status"
					:column="column"
					:row="row"
					data-test-id="table-cell"
					@click="$emit('rowClick', row)"
				/>
			</template>
		</ElTableColumn>
	</ElTable>
</template>

<style module lang="scss">
.table {
	:global(.el-table__cell) {
		padding: var(--spacing-3xs) 0;
	}
}
</style>
