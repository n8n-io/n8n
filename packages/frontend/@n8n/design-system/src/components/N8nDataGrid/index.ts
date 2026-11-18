import { defineAsyncComponent } from 'vue';

import N8nDataGridLoadingIndicator from './DataGridLoadingIndicator.vue';

const N8nDataGrid = defineAsyncComponent(async () => await import('./DataGrid.vue'));

export { compareDataGridValues } from './cellValues';
export { matchesDataGridFilter } from './filters';

export default N8nDataGrid;
export { N8nDataGrid, N8nDataGridLoadingIndicator };
export type {
	DataGridCellEdit,
	DataGridCellHover,
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
	DataGridHeaderSlotProps,
	DataGridProps,
	DataGridRow,
	DataGridSlots,
	DataGridSort,
	DataGridSortDirection,
} from './DataGrid.types';
