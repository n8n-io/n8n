import { useMessage } from '@/app/composables/useMessage';
import { useToast } from '@n8n/composables/useToast';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import type {
	AddColumnResponse,
	DataTableColumn,
	DataTableColumnCreatePayload,
	DataTableRow,
	DataTableValue,
} from '@/features/core/dataTable/dataTable.types';
import { ref, type Ref } from 'vue';
import orderBy from 'lodash/orderBy';
import type { DataGridCellEdit, DataGridColumnMove } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import { MODAL_CONFIRM } from '@/app/constants';
import { isDataTableValue } from '@/features/core/dataTable/typeGuards';
import { useDataTableTypes } from '@/features/core/dataTable/composables/useDataTableTypes';
import { isUnsafeNumberValue } from '@/features/core/dataTable/utils/columnUtils';
import { reorderItem } from '@/features/core/dataTable/utils';
import { ResponseError } from '@n8n/rest-api-client';
import { escapeHtml } from '@/app/utils/htmlUtils';

const COLUMNS_BEFORE_USER_COLUMNS = 1;

export type UseDataTableOperationsParams = {
	dataTableId: string;
	projectId: string;
	rows: Ref<DataTableRow[]>;
	columns: Ref<DataTableColumn[]>;
	totalItems: Ref<number>;
	setTotalItems: (count: number) => void;
	ensureItemOnPage: (itemIndex: number) => Promise<void>;
	currentPage: Ref<number>;
	pageSize: Ref<number>;
	sortBy: Ref<string>;
	filterJSON: Ref<string | undefined>;
	searchQuery: Ref<string | undefined>;
	/** Blocks column changes. Row changes are never blocked here. */
	schemaReadOnly: Ref<boolean>;
	clearSelection: () => void;
	focusRow: (rowId: number) => void;
	toggleSave: (value: boolean) => void;
};

export const useDataTableOperations = ({
	dataTableId,
	projectId,
	rows,
	columns,
	totalItems,
	setTotalItems,
	ensureItemOnPage,
	currentPage,
	pageSize,
	sortBy,
	filterJSON,
	searchQuery,
	schemaReadOnly,
	clearSelection,
	focusRow,
	toggleSave,
}: UseDataTableOperationsParams) => {
	const i18n = useI18n();
	const toast = useToast();
	const message = useMessage();
	const dataTableStore = useDataTableStore();
	const telemetry = useTelemetry();
	const { mapToAGCellType } = useDataTableTypes();
	const contentLoading = ref(true);

	const findColumn = (columnId: string) => columns.value.find((col) => col.id === columnId);

	const confirmDelete = async (text: string, title: string) =>
		(await message.confirm(text, title, {
			confirmButtonText: i18n.baseText('generic.delete'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		})) === MODAL_CONFIRM;

	const parseColumnOperationError = (error: unknown): { httpStatus: number; message: string } => {
		if (error instanceof ResponseError) {
			return { httpStatus: error.httpStatusCode ?? 500, message: error.message };
		}
		if (error instanceof Error) {
			return { httpStatus: 500, message: error.message };
		}
		return { httpStatus: 500, message: i18n.baseText('generic.unknownError') };
	};

	const setRowValue = (rowKey: string, field: string, value: DataTableValue) => {
		rows.value = rows.value.map((row) =>
			String(row.id) === rowKey ? { ...row, [field]: value } : row,
		);
	};

	const renameRowField = (oldName: string, newName: string) => {
		rows.value = rows.value.map(({ [oldName]: value, ...rest }) => ({
			...rest,
			[newName]: value ?? null,
		}));
	};

	async function onDeleteColumn(columnId: string) {
		if (schemaReadOnly.value) return;
		const column = findColumn(columnId);
		if (!column) return;

		const confirmed = await confirmDelete(
			i18n.baseText('dataTable.deleteColumn.confirm.message', {
				interpolate: { name: escapeHtml(column.name) },
			}),
			i18n.baseText('dataTable.deleteColumn.confirm.title'),
		);
		if (!confirmed || schemaReadOnly.value) return;

		const previousColumns = columns.value;
		const previousRows = rows.value;
		columns.value = columns.value.filter((col) => col.id !== columnId);
		rows.value = rows.value.map(({ [column.name]: _, ...rest }) => rest);
		try {
			await dataTableStore.deleteDataTableColumn(dataTableId, projectId, columnId);
			telemetry.track('User deleted data table column', {
				column_id: columnId,
				column_type: mapToAGCellType(column.type),
				data_table_id: dataTableId,
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('dataTable.deleteColumn.error'));
			columns.value = previousColumns;
			rows.value = previousRows;
		}
	}

	async function onRenameColumn(columnId: string, newName: string): Promise<void> {
		if (schemaReadOnly.value) return;
		const column = findColumn(columnId);
		if (!column || column.name === newName) return;

		const oldName = column.name;
		const previousColumns = columns.value;
		const previousRows = rows.value;
		columns.value = columns.value.map((col) =>
			col.id === columnId ? { ...col, name: newName } : col,
		);
		renameRowField(oldName, newName);

		try {
			toggleSave(true);
			await dataTableStore.renameDataTableColumn(dataTableId, projectId, columnId, newName);
			telemetry.track('User renamed data table column', {
				column_id: columnId,
				column_type: mapToAGCellType(column.type),
				data_table_id: dataTableId,
			});
		} catch (error) {
			columns.value = previousColumns;
			rows.value = previousRows;
			const errorDetails = parseColumnOperationError(error);
			if (errorDetails.httpStatus === 409) {
				toast.showError(
					new Error(errorDetails.message),
					i18n.baseText('dataTable.column.alreadyExistsError'),
				);
			} else {
				toast.showError(error, i18n.baseText('dataTable.renameColumn.error'));
			}
		} finally {
			toggleSave(false);
		}
	}

	async function onAddColumn(column: DataTableColumnCreatePayload): Promise<AddColumnResponse> {
		if (schemaReadOnly.value) return { success: false };
		try {
			const newColumn = await dataTableStore.addDataTableColumn(dataTableId, projectId, column);
			columns.value = [...columns.value, newColumn];
			rows.value = rows.value.map((row) => ({ ...row, [newColumn.name]: null }));
			telemetry.track('User added data table column', {
				column_id: newColumn.id,
				column_type: newColumn.type,
				data_table_id: dataTableId,
			});
			return { success: true, httpStatus: 200 };
		} catch (error) {
			const addColumnError = parseColumnOperationError(error);
			return {
				success: false,
				httpStatus: addColumnError.httpStatus,
				errorMessage: addColumnError.message,
			};
		}
	}

	async function onColumnMove({ columnId, toIndex }: DataGridColumnMove) {
		if (schemaReadOnly.value) return;
		const ordered = orderBy(columns.value, 'index');
		const fromIndex = ordered.findIndex((col) => col.id === columnId);
		const targetIndex = Math.min(
			Math.max(toIndex - COLUMNS_BEFORE_USER_COLUMNS, 0),
			ordered.length - 1,
		);
		if (fromIndex === -1 || fromIndex === targetIndex) return;

		const previousColumns = columns.value;
		columns.value = reorderItem(
			columns.value,
			ordered[fromIndex].index,
			ordered[targetIndex].index,
		);
		try {
			await dataTableStore.moveDataTableColumn(dataTableId, projectId, columnId, targetIndex);
		} catch (error) {
			toast.showError(error, i18n.baseText('dataTable.moveColumn.error'));
			columns.value = previousColumns;
		}
	}

	async function onAddRowClick() {
		try {
			await ensureItemOnPage(totalItems.value + 1);

			contentLoading.value = true;
			toggleSave(true);
			const insertedRow = await dataTableStore.insertEmptyRow(dataTableId, projectId);
			rows.value = [...rows.value, insertedRow];
			setTotalItems(totalItems.value + 1);
			if (typeof insertedRow.id === 'number') {
				focusRow(insertedRow.id);
			}
			telemetry.track('User added row to data table', {
				data_table_id: dataTableId,
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('dataTable.addRow.error'));
		} finally {
			toggleSave(false);
			contentLoading.value = false;
		}
	}

	async function onCellEdit({ rowKey, field, oldValue, newValue }: DataGridCellEdit) {
		if (!isDataTableValue(newValue)) return;
		const column = columns.value.find((col) => col.name === field);

		setRowValue(rowKey, field, newValue);
		try {
			toggleSave(true);
			await dataTableStore.updateRow(dataTableId, projectId, Number(rowKey), {
				[field]: newValue,
			});
			telemetry.track('User edited data table content', {
				data_table_id: dataTableId,
				column_id: column?.id,
				column_type: column ? mapToAGCellType(column.type) : undefined,
			});
			if (isUnsafeNumberValue(newValue)) {
				toast.showMessage({
					title: i18n.baseText('dataTable.updateRow.numberPrecisionWarning.title'),
					message: i18n.baseText('dataTable.updateRow.numberPrecisionWarning.message'),
					type: 'warning',
				});
			}
		} catch (error) {
			setRowValue(rowKey, field, isDataTableValue(oldValue) ? oldValue : null);
			toast.showError(error, i18n.baseText('dataTable.updateRow.error'));
		} finally {
			toggleSave(false);
		}
	}

	async function fetchDataTableRows(): Promise<boolean> {
		try {
			contentLoading.value = true;
			const fetchedRows = await dataTableStore.fetchDataTableContent(
				dataTableId,
				projectId,
				currentPage.value,
				pageSize.value,
				sortBy.value,
				filterJSON.value,
				searchQuery.value,
			);
			rows.value = fetchedRows.data;
			setTotalItems(fetchedRows.count);
			clearSelection();
			return true;
		} catch (error) {
			toast.showError(error, i18n.baseText('dataTable.fetchContent.error'));
			return false;
		} finally {
			contentLoading.value = false;
		}
	}

	async function handleDeleteSelected(keys: string[]) {
		if (keys.length === 0) return;

		const confirmed = await confirmDelete(
			i18n.baseText('dataTable.deleteRows.confirmation', {
				adjustToNumber: keys.length,
				interpolate: { count: keys.length },
			}),
			i18n.baseText('dataTable.deleteRows.title'),
		);
		if (!confirmed) return;

		try {
			toggleSave(true);
			await dataTableStore.deleteRows(dataTableId, projectId, keys.map(Number));
			await fetchDataTableRows();
			telemetry.track('User deleted rows in data table', {
				data_table_id: dataTableId,
				deleted_row_count: keys.length,
			});
		} catch (error) {
			toast.showError(error, i18n.baseText('dataTable.deleteRows.error'));
		} finally {
			toggleSave(false);
		}
	}

	return {
		contentLoading,
		onDeleteColumn,
		onRenameColumn,
		onAddColumn,
		onColumnMove,
		onAddRowClick,
		onCellEdit,
		fetchDataTableRows,
		handleDeleteSelected,
	};
};
