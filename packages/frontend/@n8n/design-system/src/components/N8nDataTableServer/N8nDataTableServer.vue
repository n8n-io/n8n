<script lang="ts">
export type TableHeader<T> = {
	title?: string;
	key?: DeepKeys<T> | string;
	value?: DeepKeys<T> | AccessorFn<T>;
	disableSort?: boolean;
} & (
	| { title: string; key?: never; value?: never } // Ensures an object with only `title` is valid
	| { key: DeepKeys<T> }
	| { value: DeepKeys<T>; key?: string }
	| { key: string; value: AccessorFn<T> }
);

export type TableSortBy = SortingState;
</script>

<script setup lang="ts" generic="T extends Record<string, any>">
import type {
	AccessorFn,
	Cell,
	CellContext,
	DeepKeys,
	PaginationState,
	SortingState,
	Updater,
} from '@tanstack/vue-table';
import { createColumnHelper, FlexRender, getCoreRowModel, useVueTable } from '@tanstack/vue-table';
import { computed, shallowRef, useSlots, watch } from 'vue';

import N8nPagination from '../N8nPagination';

const props = defineProps<{
	items: T[];
	headers: Array<TableHeader<T>>;
	itemsLength: number;
	loading?: boolean;
	multiSort?: boolean;
}>();

const slots = useSlots();
defineSlots<{
	[key: `item.${string}`]: (props: { value: unknown; item: T }) => void;
	item: (props: { item: T; cells: Array<Cell<T, unknown>> }) => void;
}>();

const emit = defineEmits<{
	// eslint-disable-next-line @typescript-eslint/naming-convention
	'update:options': [
		payload: {
			page: number;
			itemsPerPage: number;
			sortBy: Array<{ id: string; desc: boolean }>;
		},
	];
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

function getValueAccessor(column: Required<TableHeader<T>>) {
	if (isAccessorColumn(column)) {
		return columnHelper.accessor(column.value, {
			id: column.key,
			cell: itemKeySlot,
			header: () => getHeaderTitle(column),
			enableSorting: !column.disableSort,
		});
	} else {
		return columnHelper.accessor(column.value, {
			id: column.key ?? column.value,
			cell: itemKeySlot,
			header: () => getHeaderTitle(column),
			enableSorting: !column.disableSort,
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
			});
		}

		return columnHelper.display({
			id: `display_column_${index}`,
			header: () => getHeaderTitle(column),
		});
	});
}

const columnsDefinition = computed(() => {
	return mapHeaders(props.headers);
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

const sortBy = defineModel<SortingState>('sort-by', { default: [], required: false });

function handleSortingChange(updaterOrValue: Updater<SortingState>) {
	sortBy.value =
		typeof updaterOrValue === 'function' ? updaterOrValue(sortBy.value) : updaterOrValue;

	emit('update:options', {
		page: page.value,
		itemsPerPage: itemsPerPage.value,
		sortBy: sortBy.value,
	});
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
	},
	getCoreRowModel: getCoreRowModel(),
	onSortingChange: handleSortingChange,
	onPaginationChange(updaterOrValue) {
		pagination.value =
			typeof updaterOrValue === 'function' ? updaterOrValue(pagination.value) : updaterOrValue;

		emit('update:options', {
			page: page.value,
			itemsPerPage: itemsPerPage.value,
			sortBy: sortBy.value,
		});
	},
	manualSorting: true,
	enableMultiSort: props.multiSort,
	manualPagination: true,
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
						<template v-if="loading && !table.getRowModel().rows.length">
							<tr v-for="item in itemsPerPage" :key="item">
								<td
									v-for="coll in table.getVisibleFlatColumns()"
									:key="coll.id"
									class="el-skeleton is-animated"
								>
									<el-skeleton-item />
								</td>
							</tr>
						</template>
						<template v-else-if="table.getRowModel().rows.length">
							<template v-for="row in table.getRowModel().rows" :key="row.id">
								<slot name="item" v-bind="{ item: row.original, cells: row.getVisibleCells() }">
									<tr>
										<template v-for="cell in row.getVisibleCells()" :key="cell.id">
											<td>
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
		<div class="table-pagination" data-test-id="pagination">
			<N8nPagination
				:current-page="page + 1"
				:page-size="itemsPerPage"
				:page-sizes="[10, 20, 30, 40]"
				layout="prev, pager, next"
				:total="itemsLength"
				@update:current-page="page = $event - 1"
			>
			</N8nPagination>
			<div class="table-pagination__sizes">
				<div class="table-pagination__sizes__label">Page size</div>
				<el-select
					v-model.number="itemsPerPage"
					class="table-pagination__sizes__select"
					size="small"
					:teleported="false"
				>
					<el-option v-for="item in [10, 20, 30, 40]" :key="item" :label="item" :value="item" />
				</el-select>
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

	th,
	td {
		text-align: left;
	}

	th {
		background-color: var(--color-background-light-base);
		color: var(--color-text-base);
		font-weight: 600;
		font-size: 12px;
		padding: 0 8px;
		text-transform: capitalize;
		height: 36px;
		white-space: nowrap;
		border-bottom: 1px solid var(--color-foreground-base);

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

	tr {
		background-color: var(--color-background-xlight);
	}

	td {
		color: var(--color-text-dark);
		padding: 0 8px;
		height: 48px;

		border-bottom: 1px solid var(--color-foreground-base);

		&:first-child {
			padding-left: 16px;
		}
		&:last-child {
			padding-right: 16px;
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
</style>
