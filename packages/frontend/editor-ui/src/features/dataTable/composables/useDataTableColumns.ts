import { ref, type Ref } from 'vue';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import type {
	AddColumnResponse,
	DataTableColumn,
	DataTableColumnCreatePayload,
} from '@/features/dataTable/dataTable.types';
import {
	ADD_ROW_ROW_ID,
	DATA_TABLE_ID_COLUMN_WIDTH,
	DEFAULT_COLUMN_WIDTH,
	DEFAULT_ID_COLUMN_NAME,
} from '@/features/dataTable/constants';
import { useDataTableTypes } from '@/features/dataTable/composables/useDataTableTypes';
import ColumnHeader from '@/features/dataTable/components/dataGrid/ColumnHeader.vue';
import ElDatePickerCellEditor from '@/features/dataTable/components/dataGrid/ElDatePickerCellEditor.vue';
import ElDatePickerFilter from '@/features/dataTable/components/dataGrid/ElDatePickerFilter.vue';
import orderBy from 'lodash/orderBy';
import AddColumnButton from '@/features/dataTable/components/dataGrid/AddColumnButton.vue';
import AddRowButton from '@/features/dataTable/components/dataGrid/AddRowButton.vue';
import { reorderItem } from '@/features/dataTable/utils';
import {
	getCellClass,
	createValueGetter,
	createCellRendererSelector,
	createStringValueSetter,
	stringCellEditorParams,
	dateValueFormatter,
	numberValueFormatter,
	getStringColumnFilterOptions,
	getDateColumnFilterOptions,
	getNumberColumnFilterOptions,
	getBooleanColumnFilterOptions,
} from '@/features/dataTable/utils/columnUtils';
import { useI18n } from '@n8n/i18n';
import { GRID_FILTER_CONFIG } from '@/features/dataTable/utils/filterMappings';

export const useDataTableColumns = ({
	onDeleteColumn,
	onAddRowClick,
	onAddColumn,
	isTextEditorOpen,
}: {
	onDeleteColumn: (columnId: string) => void;
	onAddRowClick: () => void;
	onAddColumn: (column: DataTableColumnCreatePayload) => Promise<AddColumnResponse>;
	isTextEditorOpen: Ref<boolean>;
}) => {
	const colDefs = ref<ColDef[]>([]);
	const { mapToAGCellType } = useDataTableTypes();
	const i18n = useI18n();

	const createColumnDef = (col: DataTableColumn, extraProps: Partial<ColDef> = {}) => {
		const columnDef: ColDef = {
			colId: col.id,
			field: col.name,
			filter: !GRID_FILTER_CONFIG.excludedColumns.includes(col.id),
			headerName: col.name,
			sortable: true,
			editable: (params) => params.data?.id !== ADD_ROW_ROW_ID,
			resizable: true,
			lockPinned: true,
			headerComponent: ColumnHeader,
			headerComponentParams: {
				onDelete: onDeleteColumn,
				allowMenuActions: true,
			},
			cellEditorPopup: false,
			cellDataType: mapToAGCellType(col.type),
			cellClass: getCellClass,
			valueGetter: createValueGetter(col),
			cellRendererSelector: createCellRendererSelector(col),
			width: DEFAULT_COLUMN_WIDTH,
		};

		if (col.type === 'string') {
			columnDef.cellEditor = 'agLargeTextCellEditor';
			columnDef.cellEditorPopup = true;
			columnDef.cellEditorPopupPosition = 'over';
			columnDef.cellEditorParams = stringCellEditorParams;
			columnDef.valueSetter = createStringValueSetter(col, isTextEditorOpen);
			columnDef.filterParams = {
				filterOptions: getStringColumnFilterOptions(i18n),
			};
		} else if (col.type === 'date') {
			columnDef.cellEditorSelector = () => ({
				component: ElDatePickerCellEditor,
			});
			columnDef.valueFormatter = dateValueFormatter;
			columnDef.cellEditorPopup = true;
			columnDef.dateComponent = ElDatePickerFilter;
			columnDef.filterParams = {
				filterOptions: getDateColumnFilterOptions(i18n),
			};
		} else if (col.type === 'number') {
			columnDef.valueFormatter = numberValueFormatter;
			columnDef.filterParams = {
				filterOptions: getNumberColumnFilterOptions(i18n),
			};
		} else if (col.type === 'boolean') {
			columnDef.filterParams = {
				filterOptions: getBooleanColumnFilterOptions(i18n),
			};
		}

		return {
			...columnDef,
			...extraProps,
		};
	};

	const getColumnDefinitions = (dataTableColumns: DataTableColumn[]) => {
		const systemDateColumnOptions: Partial<ColDef> = {
			editable: false,
			suppressMovable: true,
			lockPinned: true,
			lockPosition: 'right',
			headerComponentParams: {
				allowMenuActions: false,
			},
			cellClass: (params) => (params.data?.id === ADD_ROW_ROW_ID ? 'add-row-cell' : 'system-cell'),
			headerClass: 'system-column',
			width: DEFAULT_COLUMN_WIDTH,
		};
		return [
			// Always add the ID column, it's not returned by the back-end but all data tables have it
			// We use it as a placeholder for new data tables
			createColumnDef(
				{
					index: 0,
					id: DEFAULT_ID_COLUMN_NAME,
					name: DEFAULT_ID_COLUMN_NAME,
					type: 'string',
				},
				{
					editable: false,
					sortable: true,
					suppressMovable: true,
					lockPosition: true,
					minWidth: DATA_TABLE_ID_COLUMN_WIDTH,
					maxWidth: DATA_TABLE_ID_COLUMN_WIDTH,
					resizable: false,
					headerClass: 'system-column',
					headerComponentParams: {
						allowMenuActions: false,
						showTypeIcon: false,
					},
					cellClass: (params) =>
						params.data?.id === ADD_ROW_ROW_ID ? 'add-row-cell' : 'id-column',
					cellRendererSelector: (params: ICellRendererParams) => {
						if (params.value === ADD_ROW_ROW_ID) {
							return {
								component: AddRowButton,
								params: { onClick: onAddRowClick },
							};
						}
						return undefined;
					},
				},
			),
			// Append other columns
			...orderBy(dataTableColumns, 'index').map((col) => createColumnDef(col)),
			createColumnDef(
				{
					index: dataTableColumns.length + 1,
					id: 'createdAt',
					name: 'createdAt',
					type: 'date',
				},
				systemDateColumnOptions,
			),
			createColumnDef(
				{
					index: dataTableColumns.length + 2,
					id: 'updatedAt',
					name: 'updatedAt',
					type: 'date',
				},
				systemDateColumnOptions,
			),
			createColumnDef(
				{
					index: dataTableColumns.length + 3,
					id: 'add-column',
					name: 'Add Column',
					type: 'string',
				},
				{
					editable: false,
					suppressMovable: true,
					lockPinned: true,
					lockPosition: 'right',
					resizable: false,
					flex: 1,
					headerComponent: AddColumnButton,
					headerComponentParams: { onAddColumn },
				},
			),
		];
	};

	const loadColumns = (dataTableColumns: DataTableColumn[]) => {
		colDefs.value = getColumnDefinitions(dataTableColumns);
	};

	const deleteColumn = (columnId: string) => {
		colDefs.value = colDefs.value.filter((col) => col.colId !== columnId);
	};

	const insertColumnAtIndex = (column: ColDef, index: number) => {
		colDefs.value.splice(index, 0, column);
	};

	const addColumn = (column: DataTableColumn) => {
		colDefs.value = [
			...colDefs.value.slice(0, -1),
			createColumnDef(column),
			...colDefs.value.slice(-1),
		];
	};

	const moveColumn = (oldIndex: number, newIndex: number) => {
		const fromIndex = oldIndex - 1; // exclude ID column
		const columnToBeMoved = colDefs.value[fromIndex];
		if (!columnToBeMoved) {
			return;
		}
		const middleWithIndex = colDefs.value
			.slice(1, -1)
			.map((col, idx) => ({ column: col, index: idx }));
		const reorderedMiddle = reorderItem(middleWithIndex, fromIndex, newIndex)
			.sort((a, b) => a.index - b.index)
			.map(({ column }) => column);
		colDefs.value = [colDefs.value[0], ...reorderedMiddle, colDefs.value[colDefs.value.length - 1]];
	};

	return {
		colDefs,
		createColumnDef,
		loadColumns,
		deleteColumn,
		insertColumnAtIndex,
		addColumn,
		moveColumn,
	};
};
