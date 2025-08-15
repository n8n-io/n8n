<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type {
	DataStore,
	DataStoreColumn,
	DataStoreColumnCreatePayload,
	DataStoreRow,
} from '@/features/dataStore/datastore.types';
import { AgGridVue } from 'ag-grid-vue3';
import {
	ModuleRegistry,
	ClientSideRowModelModule,
	TextEditorModule,
	LargeTextEditorModule,
	ColumnAutoSizeModule,
	CheckboxEditorModule,
	NumberEditorModule,
} from 'ag-grid-community';
import type { GridApi, GridReadyEvent, ColDef } from 'ag-grid-community';
import { n8nTheme } from '@/features/dataStore/components/dataGrid/n8nTheme';
import AddColumnPopover from '@/features/dataStore/components/dataGrid/AddColumnPopover.vue';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { DEFAULT_ID_COLUMN_NAME } from '@/features/dataStore/constants';
import { useDataStoreTypes } from '@/features/dataStore/composables/useDataStoreTypes';

// Register only the modules we actually use
ModuleRegistry.registerModules([
	ClientSideRowModelModule,
	TextEditorModule,
	LargeTextEditorModule,
	ColumnAutoSizeModule,
	CheckboxEditorModule,
	NumberEditorModule,
]);

type Props = {
	dataStore: DataStore;
};

const props = defineProps<Props>();

const i18n = useI18n();
const toast = useToast();
const dataStoreTypes = useDataStoreTypes();

const dataStoreStore = useDataStoreStore();

// AG Grid State
const gridApi = ref<GridApi | null>(null);
const colDefs = ref<ColDef[]>([]);
const rowData = ref<DataStoreRow[]>([]);

// Shared config for all columns
const defaultColumnDef = {
	flex: 1,
	sortable: false,
	filter: false,
};

// Pagination
const currentPage = ref(1);
const pageSize = ref(20);
const pageSizeOptions = ref([10, 20, 50]);
const totalItems = ref(0);

const onGridReady = (params: GridReadyEvent) => {
	gridApi.value = params.api;
};

const setCurrentPage = (page: number) => {
	currentPage.value = page;
};

const setPageSize = (size: number) => {
	pageSize.value = size;
	currentPage.value = 1; // Reset to first page on page size change
};

const onAddColumn = async ({ column }: { column: DataStoreColumnCreatePayload }) => {
	try {
		const newColumn = await dataStoreStore.addDataStoreColumn(
			props.dataStore.id,
			props.dataStore.projectId,
			column,
		);
		if (!newColumn) {
			throw new Error(i18n.baseText('generic.unknownError'));
		}
		colDefs.value = [...colDefs.value, createColumnDef(newColumn)];
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.addColumn.error'));
	}
};

const createColumnDef = (col: DataStoreColumn) => {
	const columnDef: ColDef = {
		colId: col.id,
		field: col.name,
		headerName: col.name,
		editable: col.name !== DEFAULT_ID_COLUMN_NAME,
		cellDataType: dataStoreTypes.mapToAGCellType(col.type),
	};
	// Enable large text editor for text columns
	if (col.type === 'string') {
		columnDef.cellEditor = 'agLargeTextCellEditor';
		columnDef.cellEditorPopup = true;
	}
	return columnDef;
};

const initColumnDefinitions = () => {
	colDefs.value = [
		// Always add the ID column, it's not returned by the back-end but all data stores have it
		// We use it as a placeholder for new datastores
		createColumnDef({
			index: 0,
			id: DEFAULT_ID_COLUMN_NAME,
			name: DEFAULT_ID_COLUMN_NAME,
			type: 'string',
		}),
		// Append other columns
		...props.dataStore.columns.map(createColumnDef),
	];
};

const initialize = () => {
	initColumnDefinitions();
};

onMounted(() => {
	initialize();
});
</script>

<template>
	<div :class="$style.wrapper">
		<div :class="$style['grid-container']" data-test-id="data-store-grid">
			<AgGridVue
				style="width: 100%"
				:row-data="rowData"
				:column-defs="colDefs"
				:default-col-def="defaultColumnDef"
				:dom-layout="'autoHeight'"
				:animate-rows="false"
				:theme="n8nTheme"
				@grid-ready="onGridReady"
			/>
			<AddColumnPopover
				:data-store="props.dataStore"
				:class="$style['add-column-popover']"
				@add-column="onAddColumn"
			/>
		</div>
		<div :class="$style.footer">
			<n8n-icon-button
				icon="plus"
				class="mb-xl"
				type="secondary"
				data-test-id="data-store-add-row-button"
			/>
			<el-pagination
				v-model:current-page="currentPage"
				v-model:page-size="pageSize"
				background
				:total="totalItems"
				:page-sizes="pageSizeOptions"
				layout="total, prev, pager, next, sizes"
				data-test-id="data-store-content-pagination"
				@update:current-page="setCurrentPage"
				@size-change="setPageSize"
			/>
		</div>
	</div>
</template>

<style module lang="scss">
.wrapper {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-m);
	width: calc(100% - var(--spacing-m) * 2);
	align-items: center;
}

.grid-container {
	position: relative;
	display: flex;
	width: 100%;

	// AG Grid style overrides
	--ag-foreground-color: var(--color-text-base);
	--ag-accent-color: var(--color-primary);
	--ag-background-color: var(--color-background-xlight);
	--ag-border-color: var(--border-color-base);
	--ag-border-radius: var(--border-radius-base);
	--ag-wrapper-border-radius: 0;
	--ag-font-family: var(--font-family);
	--ag-font-size: var(--font-size-xs);
	--ag-row-height: calc(var(--ag-grid-size) * 0.8 + 32px);

	--ag-header-background-color: var(--color-background-base);
	--ag-header-font-size: var(--font-size-xs);
	--ag-header-font-weight: var(--font-weight-bold);
	--ag-header-foreground-color: var(--color-text-dark);
	--ag-cell-horizontal-padding: calc(var(--ag-grid-size) * 0.7);
	--ag-header-column-resize-handle-color: var(--border-color-base);
	--ag-header-column-resize-handle-height: 100%;
	--ag-header-height: calc(var(--ag-grid-size) * 0.8 + 32px);

	:global(.ag-header-cell-resize) {
		width: var(--spacing-4xs);
	}
}

.add-column-popover {
	display: flex;
	position: absolute;
	right: -47px;
}

.footer {
	display: flex;
	width: 100%;
	justify-content: space-between;
	margin-bottom: var(--spacing-l);
	padding-right: var(--spacing-xl);

	:global(.el-pagination__sizes) {
		height: 100%;
		position: relative;
		top: -1px;

		input {
			height: 100%;
			min-height: 28px;
		}

		:global(.el-input__suffix) {
			width: var(--spacing-m);
		}
	}
}
</style>
