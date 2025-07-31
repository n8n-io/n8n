<script lang="ts">
export type TableHeader<T> = {
	title?: string;
	key?: DeepKeys<T> | string;
	value?: DeepKeys<T> | AccessorFn<T>;
	disableSort?: boolean;
	minWidth?: number;
	width?: number;
	align?: 'end' | 'start' | 'center';
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
	ColumnDef,
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
import { ElCheckbox, ElOption, ElSelect, ElSkeletonItem } from 'element-plus';
import get from 'lodash/get';
import { computed, h, ref, shallowRef, useSlots, watch } from 'vue';

import N8nPagination from '../N8nPagination';

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
	}>(),
	{
		itemSelectable: undefined,
		itemValue: 'id',
		pageSizes: () => [10, 25, 50, 100],
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
	return (column.columnDef.meta ?? {}) as ColumnMeta;
};

const MIN_COLUMN_WIDTH = 75;

function getValueAccessor(column: Required<TableHeader<T>>) {
	if (isAccessorColumn(column)) {
		return columnHelper.accessor(column.value, {
			id: column.key,
			cell: itemKeySlot,
			header: () => getHeaderTitle(column),
			enableSorting: !column.disableSort,
			minSize: column.minWidth ?? MIN_COLUMN_WIDTH,
			size: column.width,
			meta: {
				cellProps: {
					align: column.align,
				},
			},
		});
	} else {
		return columnHelper.accessor(column.value, {
			id: column.key ?? column.value,
			cell: itemKeySlot,
			header: () => getHeaderTitle(column),
			enableSorting: !column.disableSort,
			minSize: column.minWidth ?? MIN_COLUMN_WIDTH,
			size: column.width,
			meta: {
				cellProps: {
					align: column.align,
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
				minSize: column.minWidth ?? MIN_COLUMN_WIDTH,
				size: column.width,
				meta: {
					cellProps: {
						align: column.align,
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
					align: column.align,
				},
			},
		});
	});
}

const columnsDefinition = computed(() => {
	return [...(props.showSelect ? [selectColumn] : []), ...mapHeaders(props.headers)];
});

const page = defineModel<number>('page', { default: 0 });
watch(page, () => table.setPageIndex(page.value));

const itemsPerPage = defineModel<number>('items-per-page', { default: 10 });
watch(itemsPerPage, () => table.setPageSize(itemsPerPage.value));

const pagination = computed<PaginationState>({
	get() {
		return {
			pageIndex: page.value,
			pageSize: itemsPerPage.value,
		};
	},
	set(newValue) {
		page.value = newValue.pageIndex;
		itemsPerPage.value = newValue.pageSize;
	},
});

const showPagination = computed(() => props.itemsLength > Math.min(...props.pageSizes));

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
	size: 38,
	enablePinning: true,
	header: ({ table }) => {
		const checkboxRef = ref<typeof ElCheckbox>();
		return h(ElCheckbox, {
			ref: checkboxRef,
			modelValue: table.getIsAllRowsSelected(),
			indeterminate: table.getIsSomeRowsSelected(),
			onChange: () => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				const input = checkboxRef.value?.$el.getElementsByTagName('input')[0];
				if (!input) return;
				table.getToggleAllRowsSelectedHandler()?.({ target: input });
			},
		});
	},
	cell: ({ row }) => {
		const checkboxRef = ref<typeof ElCheckbox>();
		return h(ElCheckbox, {
			ref: checkboxRef,
			modelValue: row.getIsSelected(),
			disabled: !row.getCanSelect(),
			onChange: () => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				const input = checkboxRef.value?.$el.getElementsByTagName('input')[0];
				if (!input) return;
				row.getToggleSelectedHandler()?.({ target: input });
			},
		});
	},
	meta: {
		cellProps: {
			align: undefined,
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
	if (typeof updaterOrValue === 'function') {
		rowSelection.value = updaterOrValue(rowSelection.value);
	} else {
		rowSelection.value = updaterOrValue;
	}

	if (props.returnObject) {
		selection.value = Object.keys(rowSelection.value).map((id) => table.getRow(id).original);
	} else {
		selection.value = Object.keys(rowSelection.value);
	}
}

const selection = defineModel<string[] | T[]>('selection');
const rowSelection = ref(
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

function handlePageSizeChange(newPageSize: number) {
	// Calculate the maximum available page (0-based indexing)
	const maxPage = Math.max(0, Math.ceil(props.itemsLength / newPageSize) - 1);
	const newPage = Math.min(page.value, maxPage);

	page.value = newPage;
	itemsPerPage.value = newPageSize;
}

const columnHelper = createColumnHelper<T>();
const table = useVueTable({
	data,
	columns: columnsDefinition.value,
	get rowCount() {
		return props.itemsLength;
	},
	state: {
		get sorting() {
			return sortBy.value;
		},
		get pagination() {
			return pagination.value;
		},
		get rowSelection() {
			return rowSelection.value;
		},
	},
	getCoreRowModel: getCoreRowModel(),
	onSortingChange: handleSortingChange,
	onPaginationChange(updaterOrValue) {
		const newValue =
			typeof updaterOrValue === 'function' ? updaterOrValue(pagination.value) : updaterOrValue;

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
		<div class="n8n-data-table-server-wrapper">
			<div class="table-scroll">
				<table
					class="n8n-data-table-server"
					:class="{ 'table--loading': loading }"
					:style="{
						width: `${table.getCenterTotalSize()}px`,
						borderSpacing: 0,
						minWidth: '100%',
						tableLayout: 'fixed',
					}"
				>
					<thead :style="{ position: 'sticky', top: 0, zIndex: 2 }" :class="{ loading }">
						<tr v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
							<template v-for="header in headerGroup.headers" :key="header.id">
								<th
									:style="{
										cursor: header.column.getCanSort() ? 'pointer' : undefined,
										width: `${header.getSize()}px`,
									}"
									@mousedown="header.column.getToggleSortingHandler()?.($event)"
								>
									<FlexRender
										v-if="!header.isPlaceholder"
										:render="header.column.columnDef.header"
										:props="header.getContext()"
									/>

									<template v-if="header.column.getCanSort()">
										{{ { asc: '↑', desc: '↓' }[header.column.getIsSorted() as string] }}
									</template>

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
							<tr v-for="item in itemsPerPage" :key="item">
								<td
									v-for="coll in table.getVisibleFlatColumns()"
									:key="coll.id"
									class="el-skeleton is-animated"
								>
									<ElSkeletonItem />
								</td>
							</tr>
						</template>
						<template v-else-if="table.getRowModel().rows.length">
							<template v-for="row in table.getRowModel().rows" :key="row.id">
								<slot name="item" v-bind="{ item: row.original, cells: row.getVisibleCells() }">
									<tr @click="emit('click:row', $event, { item: row.original })">
										<template v-for="cell in row.getVisibleCells()" :key="cell.id">
											<td
												:class="{
													[`cell-align--${getColumnMeta(cell.column).cellProps.align}`]: Boolean(
														getColumnMeta(cell.column).cellProps.align,
													),
												}"
											>
												<FlexRender
													:render="cell.column.columnDef.cell"
													:props="cell.getContext()"
												/>
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
		<div v-if="showPagination" class="table-pagination" data-test-id="pagination">
			<N8nPagination
				:current-page="page + 1"
				:page-size="itemsPerPage"
				:page-sizes="pageSizes"
				layout="prev, pager, next"
				:total="itemsLength"
				@update:current-page="page = $event - 1"
			>
			</N8nPagination>
			<div class="table-pagination__sizes">
				<div class="table-pagination__sizes__label">Page size</div>
				<ElSelect
					v-model.number="itemsPerPage"
					class="table-pagination__sizes__select"
					size="small"
					:teleported="false"
					@update:model-value="handlePageSizeChange"
				>
					<ElOption v-for="item in pageSizes" :key="item" :label="item" :value="item" />
				</ElSelect>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.n8n-data-table-server {
	height: 100%;
	font-size: var(--font-size-s);

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
		text-align: left;
	}

	thead {
		background-color: var(--color-background-light-base);
		border-bottom: 1px solid var(--color-foreground-base);
	}

	th {
		color: var(--color-text-base);
		font-weight: 600;
		font-size: 12px;
		padding: 0 8px;
		text-transform: capitalize;
		height: 36px;
		white-space: nowrap;

		&:first-child {
			padding-left: 16px;
		}
		&:last-child {
			padding-right: 16px;
		}
	}

	tbody > tr {
		&:hover {
			background-color: var(--color-background-light);
		}

		&:last-child > td {
			border-bottom: 0;
		}
	}

	tbody tr {
		background-color: var(--color-background-xlight);
		border-bottom: 1px solid var(--color-foreground-base);
	}

	td {
		color: var(--color-text-dark);
		padding: 0 8px;
		height: 48px;

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
}

.n8n-data-table-server-wrapper {
	border-radius: 8px;
	border: 1px solid var(--color-foreground-base);
	overflow: hidden;
}

.table-scroll {
	max-height: 100%;
	overflow: auto;
	position: relative;
}

th.loading-row {
	background-color: transparent;
	padding: 0 !important;
	border: 0 !important;
	height: 0px;
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
	background-color: var(--color-primary);
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
	margin-top: 10px;
	display: flex;
	justify-content: flex-end;
	align-items: center;

	&__sizes {
		display: flex;

		&__label {
			color: var(--color-text-base);
			background-color: var(--color-background-light);
			border: 1px solid var(--color-foreground-base);
			border-right: 0;
			font-size: 12px;
			display: flex;
			align-items: center;
			padding: 0 8px;
			border-top-left-radius: var(--border-radius-base);
			border-bottom-left-radius: var(--border-radius-base);
		}

		&__select {
			--input-border-top-left-radius: 0;
			--input-border-bottom-left-radius: 0;
			width: 70px;
		}
	}
}

.resizer {
	position: absolute;
	top: 0;
	height: 100%;
	width: 3px;
	background: var(--color-primary);
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

.cell-align {
	&--end {
		text-align: end;
	}

	&--center {
		text-align: center;
	}
}
</style>
