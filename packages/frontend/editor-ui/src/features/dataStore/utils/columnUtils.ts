import type {
	CellClassParams,
	ICellRendererParams,
	ValueGetterParams,
	ValueSetterParams,
	CellEditRequestEvent,
	ValueFormatterParams,
} from 'ag-grid-community';
import type { Ref } from 'vue';
import { DateTime } from 'luxon';
import type { DataStoreColumn, DataStoreRow } from '@/features/dataStore/datastore.types';
import {
	ADD_ROW_ROW_ID,
	EMPTY_VALUE,
	NULL_VALUE,
	NUMBER_DECIMAL_SEPARATOR,
	NUMBER_THOUSAND_SEPARATOR,
	NUMBER_WITH_SPACES_REGEX,
} from '@/features/dataStore/constants';
import NullEmptyCellRenderer from '@/features/dataStore/components/dataGrid/NullEmptyCellRenderer.vue';
import { isDataStoreValue } from '@/features/dataStore/typeGuards';

export const getCellClass = (params: CellClassParams): string => {
	if (params.data?.id === ADD_ROW_ROW_ID) {
		return 'add-row-cell';
	}
	if (params.column.getUserProvidedColDef()?.cellDataType === 'boolean') {
		return 'boolean-cell';
	}
	return '';
};

export const createValueGetter =
	(col: DataStoreColumn) => (params: ValueGetterParams<DataStoreRow>) => {
		if (params.data?.[col.name] === null || params.data?.[col.name] === undefined) {
			return null;
		}
		if (col.type === 'date') {
			const value = params.data?.[col.name];
			if (typeof value === 'string') {
				return new Date(value);
			}
		}
		return params.data?.[col.name];
	};

export const createCellRendererSelector =
	(col: DataStoreColumn) => (params: ICellRendererParams) => {
		if (params.data?.id === ADD_ROW_ROW_ID || col.id === 'add-column') {
			return {};
		}
		let rowValue = (params.data as DataStoreRow | undefined)?.[col.name];
		if (rowValue === undefined) {
			rowValue = null;
		}
		if (rowValue === null) {
			return { component: NullEmptyCellRenderer, params: { value: NULL_VALUE } };
		}
		if (rowValue === '') {
			return { component: NullEmptyCellRenderer, params: { value: EMPTY_VALUE } };
		}
		return undefined;
	};

export const createStringValueSetter =
	(col: DataStoreColumn, isTextEditorOpen: Ref<boolean>) =>
	(params: ValueSetterParams<DataStoreRow>) => {
		let originalValue = params.data[col.name];
		if (originalValue === undefined) {
			originalValue = null;
		}
		let newValue = params.newValue as unknown as DataStoreRow[keyof DataStoreRow];

		if (!isDataStoreValue(newValue)) {
			return false;
		}

		if (originalValue === null && newValue === '') {
			return false;
		}

		if (isTextEditorOpen.value && newValue === null) {
			newValue = '';
		}

		params.data[col.name] = newValue;
		return true;
	};

export const stringCellEditorParams = (
	params: CellEditRequestEvent<DataStoreRow>,
): { value: string; maxLength: number } => ({
	value: (params.value as string | null | undefined) ?? '',
	maxLength: 999999999,
});

export const dateValueFormatter = (
	params: ValueFormatterParams<DataStoreRow, Date | null | undefined>,
): string => {
	const value = params.value;
	if (value === null || value === undefined) return '';
	// Format using user's local timezone (includes offset)
	return DateTime.fromJSDate(value).toISO() ?? '';
};

const numberWithSpaces = (num: number) => {
	const parts = num.toString().split('.');
	parts[0] = parts[0].replace(NUMBER_WITH_SPACES_REGEX, NUMBER_THOUSAND_SEPARATOR);
	return parts.join(NUMBER_DECIMAL_SEPARATOR);
};

export const numberValueFormatter = (
	params: ValueFormatterParams<DataStoreRow, number | null | undefined>,
): string => {
	const value = params.value;
	if (value === null || value === undefined) return '';
	return numberWithSpaces(value);
};
