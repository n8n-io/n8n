<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef, watch } from 'vue';
import {
	N8nDataGrid,
	N8nSelectedItemsInfo,
	type DataGridColumnActionSelect,
	type DataGridColumnRename,
	type DataGridExposed,
	type DataGridFilter,
	type DataGridSort,
} from '@n8n/design-system';
import { useDebounce } from '@n8n/composables/useDebounce';
import type {
	DataTable,
	DataTableColumn,
	DataTableRow,
} from '@/features/core/dataTable/dataTable.types';
import { DEFAULT_ID_COLUMN_NAME } from '@/features/core/dataTable/constants';
import { useDataTablePagination } from '@/features/core/dataTable/composables/useDataTablePagination';
import {
	DELETE_COLUMN_ACTION,
	useDataTableColumns,
} from '@/features/core/dataTable/composables/useDataTableColumns';
import { useDataTableOperations } from '@/features/core/dataTable/composables/useDataTableOperations';
import { toBackendFilter } from '@/features/core/dataTable/utils/filterProcessors';
import AddColumnButton from './AddColumnButton.vue';
import AddRowButton from './AddRowButton.vue';
import OversizedCellRenderer from './OversizedCellRenderer.vue';

type Props = {
	dataTable: DataTable;
	search?: string;
	/** Locks the whole grid: rows and columns. */
	readOnly?: boolean;
	/** Locks only the columns, for example on a protected instance. Rows stay editable. */
	schemaReadOnly?: boolean;
	schemaReadOnlyTooltip?: string;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	toggleSave: [value: boolean];
	ready: [];
	loadError: [];
}>();

const grid = useTemplateRef<DataGridExposed>('grid');
const { debounce } = useDebounce();

const rows = ref<DataTableRow[]>([]);
const columns = ref<DataTableColumn[]>([...props.dataTable.columns]);
const sort = ref<DataGridSort>(null);
const filters = ref<DataGridFilter[]>([]);
const selectedKeys = ref<string[]>([]);

const isReadOnly = computed(() => !!props.readOnly);
const isSchemaReadOnly = computed(() => isReadOnly.value || !!props.schemaReadOnly);
const gridColumns = useDataTableColumns(columns);

const sortBy = computed(() =>
	sort.value ? `${sort.value.field}:${sort.value.direction}` : `${DEFAULT_ID_COLUMN_NAME}:asc`,
);
const filterJSON = computed(() => {
	const backendFilter = toBackendFilter(filters.value);
	return backendFilter ? JSON.stringify(backendFilter) : undefined;
});

const {
	currentPage,
	pageSize,
	totalItems,
	pageSizeOptions,
	ensureItemOnPage,
	setTotalItems,
	setCurrentPage,
	setPageSize,
} = useDataTablePagination({ onChange: fetchRows });

const clearSelection = () => {
	selectedKeys.value = [];
};

const focusRow = (rowId: number) => {
	void nextTick(() => grid.value?.focusCell(String(rowId), undefined, { edit: true }));
};

const {
	contentLoading,
	onDeleteColumn,
	onRenameColumn,
	onAddColumn,
	onColumnMove,
	onAddRowClick,
	onCellEdit,
	fetchDataTableRows,
	handleDeleteSelected,
} = useDataTableOperations({
	dataTableId: props.dataTable.id,
	projectId: props.dataTable.projectId,
	rows,
	columns,
	totalItems,
	setTotalItems,
	ensureItemOnPage,
	currentPage,
	pageSize,
	sortBy,
	filterJSON,
	searchQuery: computed(() => props.search),
	schemaReadOnly: isSchemaReadOnly,
	clearSelection,
	focusRow,
	toggleSave: (value) => emit('toggleSave', value),
});

async function fetchRows() {
	await fetchDataTableRows();
}

const addColumnParams = computed(() => ({
	onAddColumn,
	disabled: isSchemaReadOnly.value,
	disabledTooltip:
		!isReadOnly.value && props.schemaReadOnly ? props.schemaReadOnlyTooltip : undefined,
}));

const onSort = async (value: DataGridSort) => {
	sort.value = value;
	await setCurrentPage(1);
};

const onFilters = async (value: DataGridFilter[]) => {
	filters.value = value;
	await setCurrentPage(1);
};

const onColumnAction = async ({ columnId, actionId }: DataGridColumnActionSelect) => {
	if (actionId === DELETE_COLUMN_ACTION) {
		await onDeleteColumn(columnId);
	}
};

const onColumnRename = async ({ columnId, label }: DataGridColumnRename) => {
	await onRenameColumn(columnId, label);
};

const debouncedOnSearchChange = debounce(async () => await setCurrentPage(1), {
	debounceTime: 250,
	trailing: true,
});

watch(
	() => props.search,
	() => {
		void debouncedOnSearchChange();
	},
);

watch(isReadOnly, (readOnly) => {
	if (readOnly) clearSelection();
});

const isGridReady = ref(false);
const isFirstPageLoaded = ref(false);

// The grid does not report rendered rows for an empty table.
const emitReadyWhenEmpty = async () => {
	if (isGridReady.value && isFirstPageLoaded.value && rows.value.length === 0) {
		await nextTick();
		emit('ready');
	}
};

const onGridReady = async () => {
	isGridReady.value = true;
	await emitReadyWhenEmpty();
};

onMounted(async () => {
	const loaded = await fetchDataTableRows();
	if (!loaded) {
		emit('loadError');
		return;
	}
	isFirstPageLoaded.value = true;
	await emitReadyWhenEmpty();
});

defineExpose({
	addRow: onAddRowClick,
	addColumn: onAddColumn,
	fetchDataTableRows,
});
</script>

<template>
	<div :class="$style.wrapper" :aria-busy="contentLoading" data-test-id="data-table-grid">
		<N8nDataGrid
			ref="grid"
			:rows="rows"
			:columns="gridColumns"
			row-key="id"
			:loading="contentLoading"
			:editable="!isReadOnly"
			:columns-editable="!isSchemaReadOnly"
			selectable
			:selection-disabled="isReadOnly"
			:selected-keys="selectedKeys"
			sort-mode="server"
			:sort="sort"
			filter-mode="server"
			:filters="filters"
			pagination-mode="server"
			:page="currentPage"
			:items-per-page="pageSize"
			:total="totalItems"
			:page-sizes="pageSizeOptions"
			@update:selected-keys="selectedKeys = $event"
			@update:sort="onSort"
			@update:filters="onFilters"
			@update:page="setCurrentPage"
			@update:items-per-page="setPageSize"
			@cell-edit="onCellEdit"
			@column-move="onColumnMove"
			@column-rename="onColumnRename"
			@column-action="onColumnAction"
			@delete-selected="handleDeleteSelected"
			@grid-ready="onGridReady"
			@first-data-rendered="emit('ready')"
		>
			<template #cell>
				<OversizedCellRenderer />
			</template>
			<template #header-append>
				<AddColumnButton :params="addColumnParams" />
			</template>
			<template #footer-row>
				<AddRowButton :params="{ onClick: onAddRowClick, disabled: isReadOnly }" />
			</template>
		</N8nDataGrid>
		<N8nSelectedItemsInfo
			:selected-count="selectedKeys.length"
			@delete-selected="handleDeleteSelected(selectedKeys)"
			@clear-selection="clearSelection"
		/>
	</div>
</template>

<style module lang="scss">
.wrapper {
	:global(.id-column),
	:global(.system-column),
	:global(.system-cell) {
		color: var(--color--text--tint-1);
	}

	:global(.oversized-cell) {
		cursor: not-allowed;
	}

	:global(.ag-header-cell[col-id='id']) {
		text-align: center;
	}

	:global(.ag-cell[col-id='id']) {
		border-right: var(--border-width) var(--border-style) var(--ag-border-color);
	}
}
</style>
