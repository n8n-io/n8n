import { computed, type Ref } from 'vue';
import orderBy from 'lodash/orderBy';
import type { DataGridColumn, DataGridColumnAction } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { DataTableColumn, DataTableRow } from '@/features/core/dataTable/dataTable.types';
import {
	DATA_TABLE_ID_COLUMN_WIDTH,
	DEFAULT_COLUMN_WIDTH,
	DEFAULT_ID_COLUMN_NAME,
} from '@/features/core/dataTable/constants';
import { useDataTableTypes } from '@/features/core/dataTable/composables/useDataTableTypes';
import { isOversizedValue } from '@/features/core/dataTable/utils/columnUtils';

export const DELETE_COLUMN_ACTION = 'delete';

const SYSTEM_DATE_COLUMNS = ['createdAt', 'updatedAt'] as const;

const isOversizedCell = (field: string) => (row: DataTableRow) => isOversizedValue(row[field]);

export const useDataTableColumns = (columns: Ref<DataTableColumn[]>) => {
	const i18n = useI18n();
	const { getIconForType } = useDataTableTypes();

	const columnActions: DataGridColumnAction[] = [
		{
			id: DELETE_COLUMN_ACTION,
			label: i18n.baseText('dataTable.deleteColumn.confirm.title'),
			icon: 'trash-2',
		},
	];

	const idColumn: DataGridColumn<DataTableRow> = {
		id: DEFAULT_ID_COLUMN_NAME,
		field: DEFAULT_ID_COLUMN_NAME,
		label: DEFAULT_ID_COLUMN_NAME,
		type: 'string',
		width: DATA_TABLE_ID_COLUMN_WIDTH,
		minWidth: DATA_TABLE_ID_COLUMN_WIDTH,
		maxWidth: DATA_TABLE_ID_COLUMN_WIDTH,
		resizable: false,
		filterable: false,
		editable: false,
		lock: 'left',
		headerClass: 'system-column',
		cellClass: 'id-column',
	};

	const systemDateColumns = SYSTEM_DATE_COLUMNS.map(
		(name): DataGridColumn<DataTableRow> => ({
			id: name,
			field: name,
			label: name,
			type: 'date',
			icon: getIconForType('date'),
			width: DEFAULT_COLUMN_WIDTH,
			editable: false,
			lock: 'right',
			headerClass: 'system-column',
			cellClass: 'system-cell',
		}),
	);

	const toGridColumn = (column: DataTableColumn): DataGridColumn<DataTableRow> => {
		const gridColumn: DataGridColumn<DataTableRow> = {
			id: column.id,
			field: column.name,
			label: column.name,
			type: column.type,
			icon: getIconForType(column.type),
			width: DEFAULT_COLUMN_WIDTH,
			renameable: true,
			actions: columnActions,
		};
		if (column.type !== 'string') return gridColumn;

		const isOversized = isOversizedCell(column.name);
		return {
			...gridColumn,
			editable: (row) => !isOversized(row),
			cellSlot: isOversized,
			cellClass: (row) => (isOversized(row) ? 'oversized-cell' : undefined),
		};
	};

	return computed(() => [
		idColumn,
		...orderBy(columns.value, 'index').map(toGridColumn),
		...systemDateColumns,
	]);
};
