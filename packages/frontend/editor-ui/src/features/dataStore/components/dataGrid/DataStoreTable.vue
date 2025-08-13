<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type {
	DataStore,
	DataStoreColumnCreatePayload,
	DataStoreRow,
} from '@/features/dataStore/datastore.types';
import { AgGridVue } from 'ag-grid-vue3';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import type { GridApi, GridReadyEvent, ColDef } from 'ag-grid-community';
import { n8nTheme } from '@/features/dataStore/components/dataGrid/n8nTheme';
import AddColumnPopover from '@/features/dataStore/components/dataGrid/AddColumnPopover.vue';
import { useDataStoreStore } from '@/features/dataStore/dataStore.store';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';
import { DEFAULT_ID_COLUMN_NAME } from '@/features/dataStore/constants';

// Register all Community features
ModuleRegistry.registerModules([AllCommunityModule]);

type Props = {
	dataStore: DataStore;
};

const props = defineProps<Props>();

const i18n = useI18n();
const toast = useToast();

const dataStoreStore = useDataStoreStore();

// AG Grid State
const gridApi = ref<GridApi | null>(null);
const colDefs = ref<ColDef[]>([]);
const rowData = ref<DataStoreRow[]>([]);

// Pagination
const currentPage = ref(1);
const pageSize = ref(20);
const pageSizeOptions = ref([10, 20, 50]);
const totalItems = ref(0);

const onGridReady = (params: GridReadyEvent) => {
	gridApi.value = params.api;
};

const onColumnMoved = () => {
	// Refresh headers to update the button visibility
	if (gridApi.value) {
		gridApi.value.refreshHeader();
	}
};

const setCurrentPage = async (page: number) => {
	currentPage.value = page;
	// await fetchData();
};

const setPageSize = async (size: number) => {
	pageSize.value = size;
	currentPage.value = 1; // Reset to first page on page size change
	// await fetchData();
};

const onAddColumn = async ({ column }: { column: DataStoreColumnCreatePayload }) => {
	// TODO:
	// - Add loading
	try {
		const newColumn = await dataStoreStore.addDataStoreColumn(props.dataStore.id, column);
		if (!newColumn) {
			throw new Error(i18n.baseText('generic.unknownError'));
		}
		colDefs.value.push({
			field: newColumn.name,
			headerName: newColumn.name,
			type: newColumn.type,
			sortable: false,
			filter: false,
			flex: 1,
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('dataStore.addColumn.error'));
	}
};

onMounted(() => {
	colDefs.value = props.dataStore.columns.map((col) => ({
		field: col.name,
		headerName: col.name,
		// TODO: Avoid hard-coding this
		editable: col.name !== DEFAULT_ID_COLUMN_NAME,
		type: col.type,
		sortable: false,
		filter: false,
		flex: 1,
	}));
	if (gridApi.value) {
		gridApi.value.refreshHeader();
	}
});
</script>

<template>
	<div :class="$style.wrapper">
		<div :class="$style['grid-container']">
			<AgGridVue
				style="width: 100%"
				:row-data="rowData"
				:column-defs="colDefs"
				:dom-layout="'autoHeight'"
				:auto-size-strategy="{ type: 'fitGridWidth', defaultMinWidth: 100 }"
				:animate-rows="false"
				:theme="n8nTheme"
				@grid-ready="onGridReady"
				@column-moved="onColumnMoved"
			/>
			<AddColumnPopover
				:data-store="props.dataStore"
				:class="$style['add-column-popover']"
				@add-column="onAddColumn"
			/>
		</div>
		<div :class="$style.footer">
			<n8n-icon-button icon="plus" class="mb-xl" type="secondary" />
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
