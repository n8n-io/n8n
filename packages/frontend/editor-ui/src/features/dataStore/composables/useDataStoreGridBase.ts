import { computed, ref, type Ref } from 'vue';
import type {
	CellEditingStartedEvent,
	CellEditingStoppedEvent,
	CellEditRequestEvent,
	ColDef,
	GridApi,
	GridReadyEvent,
	ICellRendererParams,
	ValueGetterParams,
	ValueSetterParams,
} from 'ag-grid-community';
import type {
	DataStoreColumn,
	DataStoreColumnCreatePayload,
	DataStoreRow,
} from '@/features/dataStore/datastore.types';
import {
	ADD_ROW_ROW_ID,
	DATA_STORE_ID_COLUMN_WIDTH,
	DEFAULT_ID_COLUMN_NAME,
	EMPTY_VALUE,
	NULL_VALUE,
} from '@/features/dataStore/constants';
import { useDataStoreTypes } from '@/features/dataStore/composables/useDataStoreTypes';
import ColumnHeader from '@/features/dataStore/components/dataGrid/ColumnHeader.vue';
import NullEmptyCellRenderer from '@/features/dataStore/components/dataGrid/NullEmptyCellRenderer.vue';
import ElDatePickerCellEditor from '@/features/dataStore/components/dataGrid/ElDatePickerCellEditor.vue';
import { isDataStoreValue } from '@/features/dataStore/typeGuards';
import orderBy from 'lodash/orderBy';
import AddColumnButton from '@/features/dataStore/components/dataGrid/AddColumnButton.vue';
import AddRowButton from '@/features/dataStore/components/dataGrid/AddRowButton.vue';
import { reorderItem } from '@/features/dataStore/utils';

export const useDataStoreGridBase = ({
	gridContainerRef,
	onDeleteColumn,
	onAddRowClick,
	onAddColumn,
}: {
	gridContainerRef: Ref<HTMLElement | null>;
	onDeleteColumn: (columnId: string) => void;
	onAddRowClick: () => void;
	onAddColumn: (column: DataStoreColumnCreatePayload) => Promise<boolean>;
}) => {
	const gridApi = ref<GridApi | null>(null);
	const colDefs = ref<ColDef[]>([]);
	const isTextEditorOpen = ref(false);
	const { mapToAGCellType } = useDataStoreTypes();
	const initializedGridApi = computed(() => {
		if (!gridApi.value) {
			throw new Error('Grid API is not initialized');
		}
		return gridApi.value;
	});

	const onGridReady = (params: GridReadyEvent) => {
		gridApi.value = params.api;
		// Ensure popups (e.g., agLargeTextCellEditor) are positioned relative to the grid container
		// to avoid misalignment when the page scrolls.
		if (gridContainerRef.value) {
			params.api.setGridOption('popupParent', gridContainerRef.value as unknown as HTMLElement);
		}
	};

	const setGridData = ({
		colDefs,
		rowData,
	}: {
		colDefs?: ColDef[];
		rowData?: DataStoreRow[];
	}) => {
		if (!gridApi.value) return;

		if (colDefs) {
			gridApi.value.setGridOption('columnDefs', colDefs);
		}

		if (rowData) {
			gridApi.value.setGridOption('rowData', rowData);
		}

		// special "add row" pinned to the bottom
		gridApi.value.setGridOption('pinnedBottomRowData', [{ id: ADD_ROW_ROW_ID }]);
	};

	const focusFirstEditableCell = (rowId: number) => {
		if (!gridApi.value) return;

		const rowNode = gridApi.value.getRowNode(String(rowId));
		if (rowNode?.rowIndex === null) return;

		const firstEditableCol = colDefs.value[1];
		if (!firstEditableCol?.colId) return;

		gridApi.value.ensureIndexVisible(rowNode!.rowIndex);
		gridApi.value.setFocusedCell(rowNode!.rowIndex, firstEditableCol.colId);
		gridApi.value.startEditingCell({ rowIndex: rowNode!.rowIndex, colKey: firstEditableCol.colId });
	};

	const createColumnDef = (col: DataStoreColumn, extraProps: Partial<ColDef> = {}) => {
		const columnDef: ColDef = {
			colId: col.id,
			field: col.name,
			headerName: col.name,
			sortable: true,
			flex: 1,
			editable: (params) => params.data?.id !== ADD_ROW_ROW_ID,
			resizable: true,
			lockPinned: true,
			headerComponent: ColumnHeader,
			headerComponentParams: { onDelete: onDeleteColumn, allowMenuActions: true },
			cellEditorPopup: false,
			cellDataType: mapToAGCellType(col.type),
			cellClass: (params) => {
				if (params.data?.id === ADD_ROW_ROW_ID) {
					return 'add-row-cell';
				}
				if (params.column.getUserProvidedColDef()?.cellDataType === 'boolean') {
					return 'boolean-cell';
				}
				return '';
			},
			valueGetter: (params: ValueGetterParams<DataStoreRow>) => {
				// If the value is null, return null to show empty cell
				if (params.data?.[col.name] === null || params.data?.[col.name] === undefined) {
					return null;
				}
				// Parse dates
				if (col.type === 'date') {
					const value = params.data?.[col.name];
					if (typeof value === 'string') {
						return new Date(value);
					}
				}
				return params.data?.[col.name];
			},
			cellRendererSelector: (params: ICellRendererParams) => {
				if (params.data?.id === ADD_ROW_ROW_ID || col.id === 'add-column') {
					return {};
				}
				let rowValue = params.data?.[col.name];
				// When adding new column, rowValue is undefined (same below, in string cell editor)
				if (rowValue === undefined) {
					rowValue = null;
				}

				// Custom renderer for null or empty values
				if (rowValue === null) {
					return { component: NullEmptyCellRenderer, params: { value: NULL_VALUE } };
				}
				if (rowValue === '') {
					return { component: NullEmptyCellRenderer, params: { value: EMPTY_VALUE } };
				}
				// Fallback to default cell renderer
				return undefined;
			},
		};
		// Enable large text editor for text columns
		if (col.type === 'string') {
			columnDef.cellEditor = 'agLargeTextCellEditor';
			// Use popup editor so it is not clipped by the grid viewport and positions correctly
			columnDef.cellEditorPopup = true;
			columnDef.cellEditorPopupPosition = 'over';
			// Provide initial value for the editor, otherwise agLargeTextCellEditor breaks
			columnDef.cellEditorParams = (params: CellEditRequestEvent<DataStoreRow>) => ({
				value: params.value ?? '',
				// Rely on the backend to limit the length of the value
				maxLength: 999999999,
			});
			columnDef.valueSetter = (params: ValueSetterParams<DataStoreRow>) => {
				let originalValue = params.data[col.name];
				if (originalValue === undefined) {
					originalValue = null;
				}
				let newValue = params.newValue;

				if (!isDataStoreValue(newValue)) {
					return false;
				}

				// Make sure not to trigger update if cell content is not set and value was null
				if (originalValue === null && newValue === '') {
					return false;
				}

				// When clearing editor content, set value to empty string
				if (isTextEditorOpen.value && newValue === null) {
					newValue = '';
				}

				// Otherwise update the value
				params.data[col.name] = newValue;
				return true;
			};
		}
		// Setup date editor
		if (col.type === 'date') {
			columnDef.cellEditorSelector = () => ({
				component: ElDatePickerCellEditor,
			});
			columnDef.valueFormatter = (params) => {
				const value = params.value as Date | null | undefined;
				if (value === null || value === undefined) return '';
				return value.toISOString();
			};
		}
		return {
			...columnDef,
			...extraProps,
		};
	};

	const onCellEditingStarted = (params: CellEditingStartedEvent<DataStoreRow>) => {
		if (params.column.getColDef().cellDataType === 'text') {
			isTextEditorOpen.value = true;
		} else {
			isTextEditorOpen.value = false;
		}
	};

	const onCellEditingStopped = (params: CellEditingStoppedEvent<DataStoreRow>) => {
		if (params.column.getColDef().cellDataType === 'text') {
			isTextEditorOpen.value = false;
		}
	};

	const getColumnDefinitions = (dataStoreColumns: DataStoreColumn[]) => {
		const systemDateColumnOptions: Partial<ColDef> = {
			editable: false,
			suppressMovable: true,
			lockPinned: true,
			lockPosition: 'right',
			headerComponentParams: {
				allowMenuActions: false,
			},
		};
		return [
			// Always add the ID column, it's not returned by the back-end but all data stores have it
			// We use it as a placeholder for new datastores
			createColumnDef(
				{
					index: 0,
					id: DEFAULT_ID_COLUMN_NAME,
					name: DEFAULT_ID_COLUMN_NAME,
					type: 'string',
				},
				{
					editable: false,
					sortable: false,
					suppressMovable: true,
					headerComponent: null,
					lockPosition: true,
					minWidth: DATA_STORE_ID_COLUMN_WIDTH,
					maxWidth: DATA_STORE_ID_COLUMN_WIDTH,
					resizable: false,
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
			...orderBy(dataStoreColumns, 'index').map((col) => createColumnDef(col)),
			createColumnDef(
				{
					index: dataStoreColumns.length + 1,
					id: 'createdAt',
					name: 'createdAt',
					type: 'date',
				},
				systemDateColumnOptions,
			),
			createColumnDef(
				{
					index: dataStoreColumns.length + 2,
					id: 'updatedAt',
					name: 'updatedAt',
					type: 'date',
				},
				systemDateColumnOptions,
			),
			createColumnDef(
				{
					index: dataStoreColumns.length + 3,
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
					headerComponent: AddColumnButton,
					headerComponentParams: { onAddColumn },
				},
			),
		];
	};

	const loadColumns = (dataStoreColumns: DataStoreColumn[]) => {
		colDefs.value = getColumnDefinitions(dataStoreColumns);
		setGridData({ colDefs: colDefs.value });
	};

	const deleteColumn = (columnId: string) => {
		colDefs.value = colDefs.value.filter((col) => col.colId !== columnId);
		setGridData({ colDefs: colDefs.value });
	};

	const insertColumn = (column: ColDef, index: number) => {
		colDefs.value.splice(index, 0, column);
		setGridData({ colDefs: colDefs.value });
	};

	const addColumn = (column: DataStoreColumn) => {
		colDefs.value = [
			...colDefs.value.slice(0, -1),
			createColumnDef(column),
			...colDefs.value.slice(-1),
		];
		setGridData({ colDefs: colDefs.value });
	};

	const moveColumn = (oldIndex: number, newIndex: number) => {
		const fromIndex = oldIndex - 1; // exclude ID column
		const columnToBeMoved = colDefs.value[fromIndex];
		if (!columnToBeMoved) {
			return;
		}
		const toIndex = newIndex; // exclude selection + ID columns used by AG Grid indices
		const middleWithIndex = colDefs.value.slice(1, -1).map((col, index) => ({ ...col, index }));
		const reorderedMiddle = reorderItem(middleWithIndex, fromIndex, toIndex)
			.sort((a, b) => a.index - b.index)
			.map(({ index, ...col }) => col);
		colDefs.value = [colDefs.value[0], ...reorderedMiddle, colDefs.value[colDefs.value.length - 1]];
	};

	return {
		onGridReady,
		setGridData,
		focusFirstEditableCell,
		onCellEditingStarted,
		onCellEditingStopped,
		createColumnDef,
		loadColumns,
		colDefs,
		deleteColumn,
		insertColumn,
		addColumn,
		moveColumn,
		gridApi: initializedGridApi,
	};
};
