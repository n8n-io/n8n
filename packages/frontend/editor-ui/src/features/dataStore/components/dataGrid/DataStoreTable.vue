<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type {
	DataStore,
	DataStoreColumn,
	DataStoreColumnCreatePayload,
	DataStoreRow,
	DataStoreValue,
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
	RowSelectionModule,
	RenderApiModule,
	DateEditorModule,
	ClientSideRowModelApiModule,
} from 'ag-grid-community';
import type {
	GridApi,
	GridReadyEvent,
	ColDef,
	RowSelectionOptions,
	CellValueChangedEvent,
	ValueGetterParams,
} from 'ag-grid-community';
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
	RowSelectionModule,
	RenderApiModule,
	DateEditorModule,
	ClientSideRowModelApiModule,
]);

type Props = {
	dataStore: DataStore;
};

const props = defineProps<Props>();

const emit = defineEmits<{
	toggleSave: [value: boolean];
}>();

const i18n = useI18n();
const toast = useToast();
const dataStoreTypes = useDataStoreTypes();

const dataStoreStore = useDataStoreStore();

// AG Grid State
const gridApi = ref<GridApi | null>(null);
const colDefs = ref<ColDef[]>([]);
const rowData = ref<DataStoreRow[]>([]);
const rowSelection = ref<RowSelectionOptions | 'single' | 'multiple'>({
	mode: 'singleRow',
	enableClickSelection: true,
	checkboxes: false,
});

const contentLoading = ref(false);

// Shared config for all columns
const defaultColumnDef = {
	flex: 1,
	sortable: false,
	filter: false,
};

// Pagination
const pageSizeOptions = [10, 20, 50];
const currentPage = ref(1);
const pageSize = ref(20);
const totalItems = ref(0);

// Data store content
const rows = ref<DataStoreRow[]>([]);

const onGridReady = (params: GridReadyEvent) => {
	gridApi.value = params.api;
};

const setCurrentPage = async (page: number) => {
	currentPage.value = page;
	await fetchDataStoreContent();
};
const setPageSize = async (size: number) => {
	pageSize.value = size;
	currentPage.value = 1; // Reset to first page on page size change
	await fetchDataStoreContent();
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
		valueGetter: (params: ValueGetterParams<DataStoreRow>) => {
			// If the value is null, return the default value for the column type
			if (params.data?.[col.name] === null) {
				return dataStoreTypes.getDefaultValueForType(col.type);
			}
			// Parse dates
			if (col.type === 'date') {
				return new Date(params.data?.[col.name] as string);
			}
			return params.data?.[col.name];
		},
	};
	// Enable large text editor for text columns
	if (col.type === 'string') {
		columnDef.cellEditor = 'agLargeTextCellEditor';
		columnDef.cellEditorPopup = true;
	}
	// Setup date editor
	if (col.type === 'date') {
		columnDef.cellEditor = 'agDateCellEditor';
	}
	return columnDef;
};

const onAddRowClick = async () => {
	try {
		// Go to last page if we are not there already
		if (currentPage.value * pageSize.value < totalItems.value) {
			await setCurrentPage(Math.floor(totalItems.value / pageSize.value));
		}
		const inserted = await dataStoreStore.insertEmptyRow(props.dataStore);
		if (!inserted) {
			throw new Error(i18n.baseText('generic.unknownError'));
		}
		await fetchDataStoreContent();
		emit('toggleSave', true);
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.addRow.error'));
	} finally {
		emit('toggleSave', false);
	}
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

const onCellValueChanged = async (params: CellValueChangedEvent) => {
	const { data, oldValue, colDef, api } = params;

	try {
		emit('toggleSave', true);
		await dataStoreStore.upsertRow(props.dataStore.id, props.dataStore.projectId ?? '', data);
	} catch (error) {
		// Revert old value if update fails
		const fieldName = String(colDef.field);
		const revertedData: DataStoreRow = { ...data, [fieldName]: oldValue as DataStoreValue };
		api.applyTransaction({
			update: [revertedData],
		});

		toast.showError(error, i18n.baseText('dataStore.updateRow.error'));
	} finally {
		emit('toggleSave', false);
	}
};

const fetchDataStoreContent = async () => {
	try {
		contentLoading.value = true;
		const fetchedRows = await dataStoreStore.fetchDataStoreContent(
			props.dataStore.id,
			props.dataStore.projectId ?? '',
			currentPage.value,
			pageSize.value,
		);
		rows.value = fetchedRows.data;
		totalItems.value = fetchedRows.count;
		rowData.value = rows.value;
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.fetchContent.error'));
	} finally {
		contentLoading.value = false;
		if (gridApi.value) {
			gridApi.value.refreshHeader();
		}
	}
};

const initialize = async () => {
	initColumnDefinitions();
	await fetchDataStoreContent();
};

onMounted(async () => {
	await initialize();
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
				:loading="contentLoading"
				:row-selection="rowSelection"
				:get-row-id="(params) => params.data.id"
				:single-click-edit="true"
				:stop-editing-when-cells-lose-focus="true"
				@grid-ready="onGridReady"
				@cell-value-changed="onCellValueChanged"
			/>
			<AddColumnPopover
				:data-store="props.dataStore"
				:class="$style['add-column-popover']"
				@add-column="onAddColumn"
			/>
		</div>
		<div :class="$style.footer">
			<n8n-tooltip :content="i18n.baseText('dataStore.addRow.label')">
				<n8n-icon-button
					data-test-id="data-store-add-row-button"
					icon="plus"
					class="mb-xl"
					type="secondary"
					@click="onAddRowClick"
				/>
			</n8n-tooltip>
			<el-pagination
				v-model:current-page="currentPage"
				v-model:page-size="pageSize"
				data-test-id="data-store-content-pagination"
				background
				:total="totalItems"
				:page-sizes="pageSizeOptions"
				layout="total, prev, pager, next, sizes"
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
