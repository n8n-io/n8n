<script setup lang="ts" generic="T extends object">
import { SHORT_TABLE_CELL_MIN_WIDTH } from '@/views/Evaluations.ee/utils';
import { N8nIcon, N8nTooltip } from '@n8n/design-system';
import type { ColumnCls, TableInstance } from 'element-plus';
import { ElTable, ElTableColumn } from 'element-plus';
import isEqual from 'lodash/isEqual';
import { nextTick, ref, useCssModule, watch } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

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
	showHeaderTooltip?: boolean;
	showOverflowTooltip?: boolean;
	width?: number;
	sortable?: boolean;
	filters?: Array<{ text: string; value: string }>;
	filterMethod?: (value: string, row: TRow) => boolean;
	route?: (row: TRow) => RouteLocationRaw | undefined;
	errorRoute?: (row: TRow) => RouteLocationRaw | undefined;
	sortMethod?: (a: TRow, b: TRow) => number;
	openInNewTab?: boolean;
	formatter?: (row: TRow) => string;
	minWidth?: number;
};

type TableRow = T & { id: string };
const props = withDefaults(
	defineProps<{
		data: TableRow[];
		columns: Array<TestTableColumn<TableRow>>;
		showControls?: boolean;
		defaultSort?: { prop: string; order: 'ascending' | 'descending' };
		selectable?: boolean;
		selectableFilter?: (row: TableRow) => boolean;
		expandedRows?: Set<string>;
	}>(),
	{
		defaultSort: () => ({ prop: 'date', order: 'descending' }),
		selectable: false,
		selectableFilter: () => true,
		expandedRows: () => new Set(),
	},
);

const $style = useCssModule();

const tableRef = ref<TableInstance>();
const selectedRows = ref<TableRow[]>([]);
const localData = ref<TableRow[]>([]);
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

const handleColumnResize = (
	newWidth: number,
	_oldWidth: number,
	column: { minWidth: number; width: number },
	// event: MouseEvent,
) => {
	if (column.minWidth && newWidth < column.minWidth) {
		column.width = column.minWidth;
	}
};

const getCellClassName: ColumnCls<TableRow> = ({ row }) => {
	return `${props.expandedRows?.has(row.id) ? $style.expandedCell : $style.baseCell}`;
};

const getRowClassName: ColumnCls<TableRow> = ({ row }) => {
	const baseClass =
		'status' in row && row?.status === 'error' ? $style.customDisabledRow : $style.customRow;

	const expandedClass = props.expandedRows?.has(row.id) ? $style.expandedRow : '';
	return `${baseClass} ${expandedClass}`;
};

defineSlots<{
	id(props: { row: TableRow }): unknown;
	index(props: { row: TableRow }): unknown;
	status(props: { row: TableRow }): unknown;
}>();
</script>

<template>
	<ElTable
		ref="tableRef"
		:class="$style.table"
		:default-sort="defaultSort"
		:data="localData"
		:border="true"
		:cell-class-name="getCellClassName"
		:row-class-name="getRowClassName"
		scrollbar-always-on
		@selection-change="handleSelectionChange"
		@header-dragend="handleColumnResize"
		@row-click="(row) => $emit('rowClick', row)"
	>
		<ElTableColumn
			v-if="selectable"
			type="selection"
			:selectable="selectableFilter"
			data-test-id="table-column-select"
			width="46"
			fixed
			align="center"
		/>
		<ElTableColumn
			v-for="column in columns"
			:key="column.prop"
			v-bind="column"
			:resizable="true"
			data-test-id="table-column"
			:min-width="column.minWidth ?? SHORT_TABLE_CELL_MIN_WIDTH"
		>
			<template #header="headerProps">
				<N8nTooltip
					:content="headerProps.column.label"
					placement="top"
					:disabled="!column.showHeaderTooltip"
				>
					<div :class="$style.customHeaderCell">
						<div :class="$style.customHeaderCellLabel">
							{{ headerProps.column.label }}
						</div>
						<div
							v-if="headerProps.column.sortable && headerProps.column.order"
							:class="$style.customHeaderCellSort"
						>
							<N8nIcon
								:icon="headerProps.column.order === 'descending' ? 'arrow-up' : 'arrow-down'"
								size="small"
							/>
						</div>
					</div>
				</N8nTooltip>
			</template>
			<template #default="{ row }">
				<slot v-if="column.prop === 'id'" name="id" v-bind="{ row }"></slot>
				<slot v-if="column.prop === 'index'" name="index" v-bind="{ row }"></slot>
				<slot v-if="column.prop === 'status'" name="status" v-bind="{ row }"></slot>
			</template>
		</ElTableColumn>
	</ElTable>
</template>

<style module lang="scss">
.baseCell {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	border-bottom: 1px solid var(--border-color-light) !important;
	vertical-align: top !important;

	> div {
		white-space: nowrap !important;
	}
}

.expandedCell {
	white-space: normal;
	background: var(--color-background-light-base);
	border-bottom: 1px solid var(--border-color-light) !important;
	vertical-align: top !important;

	> div {
		white-space: normal !important;
	}
}

.customRow {
	cursor: pointer;
	--color-table-row-hover-background: var(--color-background-base);
}

.customDisabledRow {
	cursor: default;
	--color-table-row-hover-background: var(--color-background-light);
}

.customHeaderCell {
	display: flex;
	gap: 4px;
}

.customHeaderCellLabel {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	font-size: 12px;
	font-weight: var(--font-weight-bold);
	color: var(--color-text-base);
}

.customHeaderCellSort {
	display: flex;
	align-items: center;
}

.table {
	border-radius: 12px;

	:global(.el-table__column-resize-proxy) {
		background-color: var(--color-primary);
		width: 3px;
	}

	:global(thead th) {
		padding: 6px 0;
	}

	:global(.caret-wrapper) {
		display: none;
	}

	:global(.el-scrollbar__thumb) {
		background-color: var(--color-foreground-base);
	}

	:global(.el-scrollbar__bar) {
		opacity: 1;
	}

	* {
		// hide browser scrollbars completely
		// but still allow mouse gestures to scroll
		&::-webkit-scrollbar {
			display: none;
		}

		-ms-overflow-style: none;
		scrollbar-width: none;
	}
}
</style>
