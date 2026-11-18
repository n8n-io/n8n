import type { Meta, StoryObj } from '@storybook/vue3-vite';
import { computed, ref } from 'vue';

import N8nDataGrid from './DataGrid.vue';
import type {
	DataGridCellEdit,
	DataGridColumn,
	DataGridFilter,
	DataGridSort,
} from './DataGrid.types';

type Product = {
	id: string;
	name: string | null;
	price: number;
	inStock: boolean;
	addedAt: string;
};

const createProducts = (count: number): Product[] =>
	Array.from({ length: count }, (_, index) => ({
		id: String(index + 1),
		name: index % 7 === 3 ? null : `Product ${index + 1}`,
		price: Math.round(((index * 37) % 1000) * 1.5 + 9.99),
		inStock: index % 3 !== 0,
		addedAt: new Date(Date.UTC(2026, 0, 1 + index)).toISOString(),
	}));

const columns: Array<DataGridColumn<Product>> = [
	{ id: 'id', field: 'id', label: 'ID', type: 'string', width: 80, lock: 'left', editable: false },
	{ id: 'name', field: 'name', label: 'Name', type: 'string', icon: 'text-aa', renameable: true },
	{ id: 'price', field: 'price', label: 'Price', type: 'number', icon: 'hash' },
	{ id: 'in-stock', field: 'inStock', label: 'In stock', type: 'boolean', icon: 'toggles' },
	{ id: 'added-at', field: 'addedAt', label: 'Added', type: 'date', icon: 'calendar' },
];

type GenericMeta<C> = Omit<Meta<C>, 'component'> & {
	component: Record<keyof C, unknown>;
};

const applyEdit = (rows: Product[], edit: DataGridCellEdit) =>
	rows.map((row) => (row.id === edit.rowKey ? { ...row, [edit.field]: edit.newValue } : row));

export default {
	title: 'Experimental/DataGrid',
	component: N8nDataGrid,
	parameters: {
		docs: {
			description: {
				component:
					'A data grid for tabular data. Sort, filters and pagination run in the browser or on the server. An optional edit mode lets users edit cells and columns.',
			},
		},
	},
} satisfies GenericMeta<typeof N8nDataGrid>;

type Story = StoryObj;

export const ClientMode: Story = {
	render: () => ({
		components: { N8nDataGrid },
		setup: () => ({ rows: createProducts(45), columns }),
		template: '<N8nDataGrid :rows="rows" :columns="columns" row-key="id" />',
	}),
};

export const Editable: Story = {
	render: () => ({
		components: { N8nDataGrid },
		setup() {
			const rows = ref(createProducts(12));
			const gridColumns = ref(
				columns.map((column) =>
					column.lock ? column : { ...column, actions: [{ id: 'delete', label: 'Delete column' }] },
				),
			);
			const selectedKeys = ref<string[]>([]);

			const onCellEdit = (edit: DataGridCellEdit) => {
				rows.value = applyEdit(rows.value, edit);
			};
			const onColumnMove = ({ columnId, toIndex }: { columnId: string; toIndex: number }) => {
				const moved = gridColumns.value.find((column) => column.id === columnId);
				if (!moved) return;
				const others = gridColumns.value.filter((column) => column.id !== columnId);
				gridColumns.value = [...others.slice(0, toIndex), moved, ...others.slice(toIndex)];
			};
			const onColumnRename = ({ columnId, label }: { columnId: string; label: string }) => {
				gridColumns.value = gridColumns.value.map((column) =>
					column.id === columnId ? { ...column, label } : column,
				);
			};
			const onColumnAction = ({ columnId }: { columnId: string }) => {
				gridColumns.value = gridColumns.value.filter((column) => column.id !== columnId);
			};
			const onDeleteSelected = (keys: string[]) => {
				rows.value = rows.value.filter((row) => !keys.includes(row.id));
				selectedKeys.value = [];
			};

			return {
				rows,
				gridColumns,
				selectedKeys,
				onCellEdit,
				onColumnMove,
				onColumnRename,
				onColumnAction,
				onDeleteSelected,
			};
		},
		template: `
			<N8nDataGrid
				:rows="rows"
				:columns="gridColumns"
				row-key="id"
				editable
				columns-editable
				selectable
				:selected-keys="selectedKeys"
				@update:selected-keys="selectedKeys = $event"
				@cell-edit="onCellEdit"
				@column-move="onColumnMove"
				@column-rename="onColumnRename"
				@column-action="onColumnAction"
				@delete-selected="onDeleteSelected"
			>
				<template #header-append>+</template>
				<template #footer-row>Add row</template>
			</N8nDataGrid>
		`,
	}),
};

export const ServerMode: Story = {
	render: () => ({
		components: { N8nDataGrid },
		setup() {
			const allRows = createProducts(95);
			const sort = ref<DataGridSort>(null);
			const filters = ref<DataGridFilter[]>([]);
			const page = ref(1);
			const itemsPerPage = ref(20);
			const loading = ref(false);
			const rows = ref<Product[]>([]);

			const sorted = computed(() => {
				const current = sort.value;
				if (!current) return allRows;
				const field = current.field as keyof Product;
				const direction = current.direction === 'asc' ? 1 : -1;
				return [...allRows].sort(
					(a, b) => ((a[field] ?? '') > (b[field] ?? '') ? 1 : -1) * direction,
				);
			});

			const fetchRows = () => {
				loading.value = true;
				setTimeout(() => {
					const start = (page.value - 1) * itemsPerPage.value;
					rows.value = sorted.value.slice(start, start + itemsPerPage.value);
					loading.value = false;
				}, 600);
			};

			const onSort = (value: DataGridSort) => {
				sort.value = value;
				page.value = 1;
				fetchRows();
			};
			const onFilters = (value: DataGridFilter[]) => {
				filters.value = value;
			};
			const onPage = (value: number) => {
				page.value = value;
				fetchRows();
			};
			const onItemsPerPage = (value: number) => {
				itemsPerPage.value = value;
				page.value = 1;
				fetchRows();
			};

			fetchRows();

			return {
				rows,
				columns,
				sort,
				filters,
				page,
				itemsPerPage,
				loading,
				total: allRows.length,
				onSort,
				onFilters,
				onPage,
				onItemsPerPage,
			};
		},
		template: `
			<div>
				<p>Filters (the simulated server ignores them): {{ JSON.stringify(filters) }}</p>
				<N8nDataGrid
					:rows="rows"
					:columns="columns"
					row-key="id"
					:loading="loading"
					sort-mode="server"
					:sort="sort"
					@update:sort="onSort"
					filter-mode="server"
					:filters="filters"
					@update:filters="onFilters"
					pagination-mode="server"
					:page="page"
					:items-per-page="itemsPerPage"
					:total="total"
					@update:page="onPage"
					@update:items-per-page="onItemsPerPage"
				/>
			</div>
		`,
	}),
};

export const ReadOnlyWithoutPagination: Story = {
	render: () => ({
		components: { N8nDataGrid },
		setup: () => ({ rows: createProducts(8), columns }),
		template:
			'<N8nDataGrid :rows="rows" :columns="columns" row-key="id" pagination-mode="none" selectable />',
	}),
};

export const StickyHeader: Story = {
	render: () => ({
		components: { N8nDataGrid },
		setup: () => ({ rows: createProducts(40), columns }),
		template: `
			<div style="height: 300px; overflow-y: auto" data-test-id="sticky-header-scroll">
				<N8nDataGrid :rows="rows" :columns="columns" row-key="id" pagination-mode="none" sticky-header />
			</div>
		`,
	}),
};

export const Empty: Story = {
	render: () => ({
		components: { N8nDataGrid },
		setup: () => ({ columns }),
		template: '<N8nDataGrid :rows="[]" :columns="columns" row-key="id" />',
	}),
};

export const EmptyWithFooterRow: Story = {
	render: () => ({
		components: { N8nDataGrid },
		setup: () => ({ columns }),
		template: `
			<N8nDataGrid :rows="[]" :columns="columns" row-key="id" editable selectable>
				<template #footer-row>+</template>
			</N8nDataGrid>
		`,
	}),
};
