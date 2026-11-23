import { defineAsyncComponent } from 'vue';

import N8nDataGridLoadingIndicator from './DataGridLoadingIndicator.vue';

const N8nDataGrid = defineAsyncComponent(async () => await import('./DataGrid.vue'));

export default N8nDataGrid;
export { N8nDataGrid, N8nDataGridLoadingIndicator };
export type {
	DataGridCellEdit,
	DataGridCellSlotProps,
	DataGridColumn,
	DataGridColumnAction,
	DataGridColumnActionSelect,
	DataGridColumnMove,
	DataGridColumnRename,
	DataGridColumnType,
	DataGridEmits,
	DataGridExposed,
	DataGridFilter,
	DataGridFilterOperator,
	DataGridFilterValue,
	DataGridProps,
	DataGridRow,
	DataGridSlots,
	DataGridSort,
	DataGridSortDirection,
} from './DataGrid.types';
