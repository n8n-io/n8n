<script lang="ts">
export type TableHeader<T> = {
	title?: string;
	key?: DeepKeys<T> | string;
	value?: DeepKeys<T> | AccessorFn<T>;
	disableSort?: boolean;
	minWidth?: number;
	width?: number;
	align?: 'end' | 'start' | 'center';
	resize?: boolean;
} & (
	| { title: string; key?: never; value?: never } // Ensures an object with only `title` is valid
	| { key: DeepKeys<T> }
	| { value: DeepKeys<T>; key?: string }
	| { key: string; value: AccessorFn<T> }
);
export type TableSortBy = SortingState;
export type TableOptions = {
	page: number;
	itemsPerPage: number;
	sortBy: Array<{ id: string; desc: boolean }>;
};
</script>

<script setup lang="ts" generic="T extends Record<string, any>">
import type {
	AccessorFn,
	Cell,
	CellContext,
	Column,
	ColumnDef,
	ColumnPinningState,
	CoreColumn,
	CoreOptions,
	DeepKeys,
	PaginationState,
	Row,
	RowSelectionState,
	SortingState,
	Updater,
} from '@tanstack/vue-table';
import { createColumnHelper, FlexRender, getCoreRowModel, useVueTable } from '@tanstack/vue-table';
import { useThrottleFn } from '@vueuse/core';
import { ElSkeletonItem } from 'element-plus';

// `.js` on purpose, unlike the extensionless form used elsewhere in the repo:
// `lodash` is CJS with no `exports` map, so Node cannot resolve the extensionless
// subpath once a consumer loads our `dist` as native ESM. Bundlers accept both.
import get from 'lodash/get.js';
import { computed, h, shallowRef, useSlots, useTemplateRef, watch } from 'vue';

import { useHorizontalScrollEdges } from '../../composables/useHorizontalScrollEdges';
import N8nCheckbox from '../../v2/components/Checkbox/Checkbox.vue';
import N8nPagination, { PAGINATION_ALL_ITEMS_PER_PAGE } from '../N8nPagination';

type VueClass = string | string[] | Record<string, boolean> | undefined;

const props = withDefaults(
	defineProps<{
		items: T[];
		headers: Array<TableHeader<T>>;
		itemsLength: number;
		loading?: boolean;
		multiSort?: boolean;

		showSelect?: boolean;
		/**
		 * For the selection feature to work, the data table must be able to differentiate each row in the data set. This is done using the item-value prop. It designates a property on the item that should contain a unique value. By default the property it looks for is id.
		 * You can also supply a function, if for example the unique value needs to be a composite of several properties. The function receives each item as its first argument
		 */
		itemValue?: CoreOptions<T>['getRowId'] | string;
		returnObject?: boolean;

		itemSelectable?: boolean | DeepKeys<T> | ((row: T) => boolean);
		pageSizes?: number[];
		/**
		 * Render the pager. Set this to false when the screen loads more rows itself.
		 * @default true
		 */
		pagination?: boolean;
		/**
		 * Show an All option in the page size selector.
		 * Selecting it sets items per page to `PAGINATION_ALL_ITEMS_PER_PAGE`.
		 * @default false
		 */
		showAll?: boolean;
		rowProps?: { class?: VueClass } | ((row: T, index: number) => { class?: VueClass });
		/**
		 * How many leading columns stay in place while the table scrolls horizontally.
		 * The selection column is pinned in front of these when it is shown.
		 * @default 0
		 */
		pinColumns?: number;
	}>(),
	{
		itemSelectable: undefined,
		itemValue: 'id',
		pageSizes: () => [10, 25, 50, 100],
		pagination: true,
		showAll: false,
		rowProps: undefined,
		pinColumns: 0,
	},
);

const slots = useSlots();
defineSlots<{
	[key: `item.${string}`]: (props: { value: unknown; item: T }) => void;
	item: (props: { item: T; cells: Array<Cell<T, unknown>> }) => void;
	cover?: () => void;
}>();

const emit = defineEmits<{
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'update:options': [payload: TableOptions];
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'click:row': [event: MouseEvent, payload: { item: T }];
}>();

const data = shallowRef<T[]>(props.items.concat());
watch(
	() => props.items,
	() => {
		data.value = props.items.concat();
	},
	// the sync will NOT work without the deep watcher
	{ deep: true },
);

function itemKeySlot(info: CellContext<T, unknown>) {
	const slotName = `item.${info.column.id}` as const;
	return slots[slotName]
		? slots[slotName]({ item: info.row.original, value: info.getValue() })
		: info.getValue();
}

function isValueAccessor(column: TableHeader<T>): column is Required<TableHeader<T>> {
	return !!column.value;
}

function getHeaderTitle(column: TableHeader<T>) {
	const value = typeof column.value === 'function' ? '' : column.value;

	return column.title ?? column.key ?? value;
}

function isAccessorColumn(
	column: TableHeader<T>,
): column is Omit<TableHeader<T>, 'key' | 'value'> & { key: string; value: AccessorFn<T> } {
	return typeof column.value === 'function';
}

type ColumnMeta = {
	cellProps: {
		align?: 'end' | 'start' | 'center';
	};
};

const getColumnMeta = (column: CoreColumn<T, unknown>) => {
	return (column.columnDef.meta ?? { cellProps: { align: 'start' } }) as ColumnMeta;
};

function getRowProps(row: T, index: number) {
	if (typeof props.rowProps === 'function') {
		return props.rowProps(row, index);
	}
	return props.rowProps;
}

const MIN_COLUMN_WIDTH = 75;

function getValueAccessor(column: Required<TableHeader<T>>) {
	if (isAccessorColumn(column)) {
		return columnHelper.accessor(column.value, {
			id: column.key,
			cell: itemKeySlot,
			header: () => getHeaderTitle(column),
			enableSorting: !column.disableSort,
			enableResizing: column.resize ?? true,
			minSize: column.minWidth ?? MIN_COLUMN_WIDTH,
			size: column.width,
			meta: {
				cellProps: {
					align: column.align ?? 'start',
				},
			},
		});
	} else {
		return columnHelper.accessor(column.value, {
			id: column.key ?? column.value,
			cell: itemKeySlot,
			header: () => getHeaderTitle(column),
			enableSorting: !column.disableSort,
			enableResizing: column.resize ?? true,
			minSize: column.minWidth ?? MIN_COLUMN_WIDTH,
			size: column.width,
			meta: {
				cellProps: {
					align: column.align ?? 'start',
				},
			},
		});
	}
}

function mapHeaders(columns: Array<TableHeader<T>>) {
	return columns.map((column, index) => {
		if (isValueAccessor(column)) {
			return getValueAccessor(column);
		}

		if (column.key) {
			const accessor = column.key;
			//@ts-expect-error key is marked as a string
			return columnHelper.accessor(column.key, {
				id: accessor,
				cell: itemKeySlot,
				header: () => getHeaderTitle(column),
				enableSorting: !column.disableSort,
				enableResizing: column.resize ?? true,
				minSize: column.minWidth ?? MIN_COLUMN_WIDTH,
				size: column.width,
				meta: {
					cellProps: {
						align: column.align ?? 'start',
					},
				},
			});
		}

		return columnHelper.display({
			id: `display_column_${index}`,
			header: () => getHeaderTitle(column),
			size: column.width,
			meta: {
				cellProps: {
					align: column.align ?? 'start',
				},
			},
		});
	});
}

const columnsDefinition = computed(() => {
	return [...(props.showSelect ? [selectColumn] : []), ...mapHeaders(props.headers)];
});

const columnPinning = computed<ColumnPinningState>(() => {
	if (props.pinColumns <= 0) return { left: [], right: [] };

	const pinnedCount = props.pinColumns + (props.showSelect ? 1 : 0);
	const left = columnsDefinition.value
		.slice(0, pinnedCount)
		.map((column) => column.id)
		.filter((id): id is string => id !== undefined);

	return { left, right: [] };
});

function getPinnedCellBindings(column: Column<T, unknown>) {
	if (column.getIsPinned() !== 'left') return undefined;

	return {
		class: column.getIsLastColumn('left') ? 'is-pinned is-pinned-edge' : 'is-pinned',
		style: { left: `${column.getStart('left')}px` },
	};
}

const scrollContainer = useTemplateRef<HTMLElement>('scrollContainer');
const tableElement = useTemplateRef<HTMLTableElement>('tableElement');
const { canScrollLeft } = useHorizontalScrollEdges(scrollContainer, tableElement);

const page = defineModel<number>('page', { default: 0 });
watch(page, () => table.setPageIndex(page.value));

const itemsPerPage = defineModel<number>('items-per-page', { default: 10 });

const ALL_PAGE_SKELETON_ROWS = 10;

const skeletonRowCount = computed(() =>
	itemsPerPage.value === PAGINATION_ALL_ITEMS_PER_PAGE
		? ALL_PAGE_SKELETON_ROWS
		: itemsPerPage.value,
);

watch(itemsPerPage, (value) => {
	if (value === PAGINATION_ALL_ITEMS_PER_PAGE) {
		void emitUpdateOptions({
			page: page.value,
			itemsPerPage: value,
			sortBy: sortBy.value,
		});
		return;
	}

	table.setPageSize(value);
});

const paginationState = computed<PaginationState>(() => ({
	pageIndex: page.value,
	pageSize: itemsPerPage.value,
}));

const showPagination = computed(
	() => props.pagination && props.itemsLength > Math.min(...props.pageSizes),
);

const sortBy = defineModel<SortingState>('sort-by', { default: [], required: false });

function handleSortingChange(updaterOrValue: Updater<SortingState>) {
	const newValue =
		typeof updaterOrValue === 'function' ? updaterOrValue(sortBy.value) : updaterOrValue;
	sortBy.value = newValue;

	// Use newValue instead of sortBy.value to ensure the latest value is used
	// This is because of the async nature of the Vue reactivity system
	emit('update:options', {
		page: page.value,
		itemsPerPage: itemsPerPage.value,
		sortBy: newValue,
	});
}

const SELECT_COLUMN_ID = 'data-table-select';
const selectColumn: ColumnDef<T> = {
	id: SELECT_COLUMN_ID,
	enableResizing: false,
	// 16px leading inset, 16px checkbox, 8px trailing padding.
	size: 40,
	enablePinning: true,
	header: ({ table }) => {
		return h(N8nCheckbox, {
			modelValue: table.getIsAllRowsSelected(),
			indeterminate: table.getIsSomeRowsSelected(),
			'onUpdate:modelValue': (value: boolean) => {
				table.toggleAllRowsSelected(value);
			},
		});
	},
	cell: ({ row }) => {
		return h(N8nCheckbox, {
			modelValue: row.getIsSelected(),
			disabled: !row.getCanSelect(),
			'onUpdate:modelValue': (value: boolean) => {
				row.toggleSelected(value);
			},
		});
	},
	meta: {
		cellProps: {
			align: 'start',
		},
	},
};

function getRowId(originalRow: T, index: number, parent?: Row<T>): string {
	if (typeof props.itemValue === 'function') {
		return props.itemValue(originalRow, index, parent);
	}

	return String(get(originalRow, props.itemValue));
}

function handleRowSelectionChange(updaterOrValue: Updater<RowSelectionState>) {
	const newValue =
		typeof updaterOrValue === 'function' ? updaterOrValue(rowSelection.value) : updaterOrValue;

	if (props.returnObject) {
		selection.value = Object.keys(newValue).map((id) => table.getRow(id).original);
	} else {
		selection.value = Object.keys(newValue);
	}
}

const selection = defineModel<string[] | T[]>('selection');

// Derived from the selection model so external writes (e.g. a parent
// clearing it) reach the row checkboxes
const rowSelection = computed(() =>
	(selection.value ?? []).reduce<RowSelectionState>((acc, item, index) => {
		const key = typeof item === 'string' ? item : getRowId(item, index);
		acc[key] = true;

		return acc;
	}, {}),
);

const emitUpdateOptions = useThrottleFn(
	(payload: TableOptions) => emit('update:options', payload),
	100,
);

const columnHelper = createColumnHelper<T>();
const table = useVueTable({
	data,
	// A getter keeps the column set reactive, so tables can add/remove columns
	// after mount (e.g. contextual columns that depend on the active tab).
	get columns() {
		return columnsDefinition.value;
	},
	get rowCount() {
		return props.itemsLength;
	},
	state: {
		get sorting() {
			return sortBy.value;
		},
		get pagination() {
			return paginationState.value;
		},
		get rowSelection() {
			return rowSelection.value;
		},
		get columnPinning() {
			return columnPinning.value;
		},
	},
	getCoreRowModel: getCoreRowModel(),
	onSortingChange: handleSortingChange,
	onPaginationChange(updaterOrValue) {
		const newValue =
			typeof updaterOrValue === 'function' ? updaterOrValue(paginationState.value) : updaterOrValue;

		// prevent duplicate events from being fired
		void emitUpdateOptions({
			page: newValue.pageIndex,
			itemsPerPage: newValue.pageSize,
			sortBy: sortBy.value,
		});
	},
	manualSorting: true,
	enableMultiSort: props.multiSort,
	manualPagination: true,
	columnResizeMode: 'onChange',
	columnResizeDirection: 'ltr',
	getRowId,
	enableRowSelection: (row) => {
		if (typeof props.itemSelectable === 'undefined') {
			return true;
		}
		if (typeof props.itemSelectable === 'boolean') {
			return props.itemSelectable;
		}

		if (typeof props.itemSelectable === 'function') {
			return props.itemSelectable(row.original);
		}

		return Boolean(get(row.original, props.itemSelectable));
	},
	onRowSelectionChange: handleRowSelectionChange,
});
</script>

<template>
	<div>
		<div class="n8n-data-table-server-wrapper" :class="{ 'is-scrolled-left': canScrollLeft }">
			<div ref="scrollContainer" class="table-scroll">
				<table
					ref="tableElement"
					class="n8n-data-table-server"
					:class="{ 'table--loading': loading }"
					:style="{
						width: `${table.getTotalSize()}px`,
						borderSpacing: 0,
						minWidth: '100%',
						tableLayout: 'fixed',
					}"
				>
					<thead :style="{ position: 'sticky', top: 0, zIndex: 2 }" :class="{ loading }">
						<tr v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
							<template v-for="header in headerGroup.headers" :key="header.id">
								<th
									v-bind="getPinnedCellBindings(header.column)"
									:style="{
										cursor: header.column.getCanSort() ? 'pointer' : undefined,
										width: `${header.getSize()}px`,
										maxWidth: `${header.getSize()}px`,
									}"
									:class="{
										'cell-select': header.column.id === SELECT_COLUMN_ID,
										[`cell-align--${getColumnMeta(header.column).cellProps.align}`]: true,
									}"
									@mousedown="header.column.getToggleSortingHandler()?.($event)"
								>
									<div class="cell-content">
										<FlexRender
											v-if="!header.isPlaceholder"
											:render="header.column.columnDef.header"
											:props="header.getContext()"
										/>
										<template v-if="header.column.getCanSort()">
											{{ { asc: '↑', desc: '↓' }[header.column.getIsSorted() as string] }}
										</template>
									</div>

									<div
										v-if="header.column.getCanResize()"
										:class="{ resizer: true, ['is-resizing']: header.column.getIsResizing() }"
										@mousedown.stop="header.getResizeHandler()?.($event)"
										@touchstart="header.getResizeHandler()?.($event)"
										@dblclick="header.column.resetSize()"
									></div>
								</th>
							</template>
						</tr>
						<tr v-if="loading">
							<th :colspan="table.getVisibleFlatColumns().length" class="loading-row">
								<div class="progress-bar">
									<div class="progress-bar-value"></div>
								</div>
							</th>
						</tr>
					</thead>
					<tbody>
						<template v-if="slots.cover">
							<tr>
								<td class="cover" :colspan="table.getVisibleFlatColumns().length">
									<slot name="cover" />
								</td>
							</tr>
						</template>
						<template v-if="loading && !table.getRowModel().rows.length">
							<tr v-for="item in skeletonRowCount" :key="item">
								<td
									v-for="coll in table.getVisibleFlatColumns()"
									:key="coll.id"
									v-bind="getPinnedCellBindings(coll)"
									class="el-skeleton is-animated"
								>
									<ElSkeletonItem />
								</td>
							</tr>
						</template>
						<template v-else-if="table.getRowModel().rows.length">
							<template v-for="row in table.getRowModel().rows" :key="row.id">
								<slot name="item" v-bind="{ item: row.original, cells: row.getVisibleCells() }">
									<tr
										v-bind="getRowProps(row.original, row.index)"
										@click="emit('click:row', $event, { item: row.original })"
									>
										<template v-for="cell in row.getVisibleCells()" :key="cell.id">
											<td
												v-bind="getPinnedCellBindings(cell.column)"
												:style="{
													width: `${cell.column.getSize()}px`,
													maxWidth: `${cell.column.getSize()}px`,
												}"
												:class="{
													'cell-select': cell.column.id === SELECT_COLUMN_ID,
													[`cell-align--${getColumnMeta(cell.column).cellProps.align}`]: Boolean(
														getColumnMeta(cell.column).cellProps.align,
													),
												}"
											>
												<div class="cell-content">
													<FlexRender
														:render="cell.column.columnDef.cell"
														:props="cell.getContext()"
													/>
												</div>
											</td>
										</template>
									</tr>
								</slot>
							</template>
						</template>
					</tbody>
				</table>
			</div>
		</div>
		<div v-if="showPagination" class="table-pagination">
			<N8nPagination
				:page="page + 1"
				:items-per-page="itemsPerPage"
				:total="itemsLength"
				:page-sizes="pageSizes"
				:show-all="showAll"
				:show-total="false"
				@update:page="page = $event - 1"
				@update:items-per-page="itemsPerPage = $event"
			/>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.n8n-data-table-server {
	height: 100%;
	font-size: var(--font-size--sm);

	table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		white-space: nowrap;

		> thead {
			position: sticky;
			top: 0;
			z-index: 2;
		}
	}

	th {
		position: relative;
		color: var(--color--text);
		font-weight: var(--font-weight--medium);
		font-size: 12px;
		padding: 0 8px;
		height: 36px;
		white-space: nowrap;

		&:first-child {
			padding-left: 16px;
		}

		&:last-child {
			padding-right: 16px;
		}
	}

	thead {
		background-color: var(--color--background--light-1);
		border-bottom: 1px solid var(--color--foreground);
	}

	th.is-pinned,
	td.is-pinned {
		position: sticky;
		z-index: 1;
	}

	th.is-pinned {
		background-color: var(--color--background--light-1);
	}

	td.is-pinned {
		background-color: inherit;
	}

	tbody > tr {
		&:hover {
			background-color: var(--color--background--light-2);
		}

		&:last-child > td {
			border-bottom: 0;
		}
	}

	tbody tr {
		background-color: var(--color--background--light-3);
		border-bottom: 1px solid var(--color--foreground);
		&:last-child {
			border-color: transparent;
		}
	}

	td {
		color: var(--color--text--shade-1);
		padding: 0 8px;
		height: 48px;
		overflow: hidden;

		&:first-child {
			padding-left: 16px;
		}
		&:last-child {
			padding-right: 16px;
		}

		&.cover {
			width: 0;
			height: 0;
			padding: 0;
			border: 0;
			overflow: visible;
		}
	}

	th.cell-select,
	td.cell-select {
		overflow: visible;

		.cell-content {
			overflow: visible;
		}
	}
}

.n8n-data-table-server-wrapper {
	position: relative;
	border-radius: 8px;
	border: 1px solid var(--color--foreground);
	overflow: hidden;

	// border-right on a sticky cell scrolls away. This line stays with the cell, under the scrollbar.
	&.is-scrolled-left .is-pinned-edge::after {
		content: '';
		position: absolute;
		top: 0;
		right: 0;
		bottom: 0;
		width: 1px;
		background-color: var(--color--foreground);
		pointer-events: none;
	}
}

.table-scroll {
	max-height: 100%;
	// No reserved scrollbar gutter: the header and the row dividers run the full width, and a
	// scrollbar shows only while the rows overflow.
	overflow: auto;
	position: relative;
}

th.loading-row {
	background-color: transparent;
	padding: 0 !important;
	border: 0 !important;
	height: 0;
	position: relative;
}

.progress-bar {
	position: absolute;
	height: 2px;
	width: 100%;
	overflow: hidden;
}

.progress-bar-value {
	width: 100%;
	height: 100%;
	background-color: var(--color--primary);
	animation: indeterminateAnimation 1s infinite linear;
	transform-origin: 0% 50%;
	position: absolute;
}

@keyframes indeterminateAnimation {
	0% {
		transform: translateX(0) scaleX(0);
	}
	40% {
		transform: translateX(0) scaleX(0.4);
	}
	100% {
		transform: translateX(100%) scaleX(0.5);
	}
}

.table--loading {
	td {
		opacity: 0.38;
	}
}

.table-pagination {
	margin-top: var(--spacing--xs);
	display: flex;
	justify-content: flex-end;
	align-items: center;
}

.resizer {
	position: absolute;
	top: 0;
	height: 100%;
	width: 3px;
	background: var(--color--primary);
	cursor: col-resize;
	user-select: none;
	touch-action: none;
	right: -2px;
	display: none;
	z-index: 1;
	&:hover {
		display: block;
	}
}

.resizer.is-resizing {
	display: block;
}

th:hover:not(:last-child) > .resizer {
	display: block;
}

// The handle extends past the cell edge. A later pinned header covers that
// part, so the handle looks thinner than on an unpinned column.
th:hover:has(.resizer),
th:has(.resizer.is-resizing) {
	z-index: 2;
}

.cell-content {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	min-width: 0;
}

.cell-align {
	&--start {
		text-align: start;
	}

	&--end {
		text-align: end;
	}

	&--center {
		text-align: center;
	}
}
</style>
