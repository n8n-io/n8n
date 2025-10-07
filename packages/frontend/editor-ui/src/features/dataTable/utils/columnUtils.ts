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
import type { I18nClass } from '@n8n/i18n';
import type { DataTableColumn, DataTableRow } from '@/features/dataTable/dataTable.types';
import {
	ADD_ROW_ROW_ID,
	EMPTY_VALUE,
	NULL_VALUE,
	NUMBER_DECIMAL_SEPARATOR,
	NUMBER_THOUSAND_SEPARATOR,
	NUMBER_WITH_SPACES_REGEX,
} from '@/features/dataTable/constants';
import NullEmptyCellRenderer from '@/features/dataTable/components/dataGrid/NullEmptyCellRenderer.vue';
import { isDataTableValue } from '@/features/dataTable/typeGuards';

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
	(col: DataTableColumn) => (params: ValueGetterParams<DataTableRow>) => {
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
	(col: DataTableColumn) => (params: ICellRendererParams) => {
		if (params.data?.id === ADD_ROW_ROW_ID || col.id === 'add-column') {
			return {};
		}
		let rowValue = (params.data as DataTableRow | undefined)?.[col.name];
		if (rowValue === undefined) {
			rowValue = null;
		}
		if (rowValue === null) {
			return {
				component: NullEmptyCellRenderer,
				params: { value: NULL_VALUE },
			};
		}
		if (rowValue === '') {
			return {
				component: NullEmptyCellRenderer,
				params: { value: EMPTY_VALUE },
			};
		}
		return undefined;
	};

export const createStringValueSetter =
	(col: DataTableColumn, isTextEditorOpen: Ref<boolean>) =>
	(params: ValueSetterParams<DataTableRow>) => {
		let originalValue = params.data[col.name];
		if (originalValue === undefined) {
			originalValue = null;
		}
		let newValue = params.newValue as unknown as DataTableRow[keyof DataTableRow];

		if (!isDataTableValue(newValue)) {
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
	params: CellEditRequestEvent<DataTableRow>,
): { value: string; maxLength: number } => ({
	value: (params.value as string | null | undefined) ?? '',
	maxLength: 999999999,
});

export const dateValueFormatter = (
	params: ValueFormatterParams<DataTableRow, Date | null | undefined>,
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
	params: ValueFormatterParams<DataTableRow, number | null | undefined>,
): string => {
	const value = params.value;
	if (value === null || value === undefined) return '';
	return numberWithSpaces(value);
};

const createNullFilterOption = (i18n: I18nClass) => ({
	displayKey: 'null',
	displayName: i18n.baseText('dataTable.filters.isNull'),
	predicate: () => true,
	numberOfInputs: 0,
});

const createNotNullFilterOption = (i18n: I18nClass) => ({
	displayKey: 'notNull',
	displayName: i18n.baseText('dataTable.filters.isNotNull'),
	predicate: () => true,
	numberOfInputs: 0,
});

const createIsEmptyFilterOption = (i18n: I18nClass) => ({
	displayKey: 'isEmpty',
	displayName: i18n.baseText('dataTable.filters.isEmpty'),
	predicate: () => true,
	numberOfInputs: 0,
});

const createIsNotEmptyFilterOption = (i18n: I18nClass) => ({
	displayKey: 'notEmpty',
	displayName: i18n.baseText('dataTable.filters.isNotEmpty'),
	predicate: () => true,
	numberOfInputs: 0,
});

const createBetweenFilterOption = (i18n: I18nClass) => ({
	displayKey: 'between',
	displayName: i18n.baseText('dataTable.filters.between'),
	predicate: () => true,
	numberOfInputs: 2,
});

const createGreaterThanFilterOption = (i18n: I18nClass) => ({
	displayKey: 'greaterThan',
	displayName: i18n.baseText('dataTable.filters.greaterThan'),
	predicate: () => true,
	numberOfInputs: 1,
});

const createGreaterThanOrEqualFilterOption = (i18n: I18nClass) => ({
	displayKey: 'greaterThanOrEqual',
	displayName: i18n.baseText('dataTable.filters.greaterThanOrEqual'),
	predicate: () => true,
	numberOfInputs: 1,
});

const createLessThanFilterOption = (i18n: I18nClass) => ({
	displayKey: 'lessThan',
	displayName: i18n.baseText('dataTable.filters.lessThan'),
	predicate: () => true,
	numberOfInputs: 1,
});

const createLessThanOrEqualFilterOption = (i18n: I18nClass) => ({
	displayKey: 'lessThanOrEqual',
	displayName: i18n.baseText('dataTable.filters.lessThanOrEqual'),
	predicate: () => true,
	numberOfInputs: 1,
});

const createInRangeFilterOption = (i18n: I18nClass) => ({
	displayKey: 'inRange',
	displayName: i18n.baseText('dataTable.filters.between'),
	predicate: () => true,
	numberOfInputs: 2,
});

export const getStringColumnFilterOptions = (i18n: I18nClass) => [
	'contains',
	'equals',
	'notEqual',
	createIsEmptyFilterOption(i18n),
	createIsNotEmptyFilterOption(i18n),
	createNullFilterOption(i18n),
	createNotNullFilterOption(i18n),
];

export const getDateColumnFilterOptions = (i18n: I18nClass) => [
	'equals',
	'notEqual',
	createLessThanFilterOption(i18n),
	createLessThanOrEqualFilterOption(i18n),
	createGreaterThanFilterOption(i18n),
	createGreaterThanOrEqualFilterOption(i18n),
	createInRangeFilterOption(i18n),
	createNullFilterOption(i18n),
	createNotNullFilterOption(i18n),
];

export const getNumberColumnFilterOptions = (i18n: I18nClass) => [
	'equals',
	'notEqual',
	createLessThanFilterOption(i18n),
	createLessThanOrEqualFilterOption(i18n),
	createGreaterThanFilterOption(i18n),
	createGreaterThanOrEqualFilterOption(i18n),
	createBetweenFilterOption(i18n),
	createNullFilterOption(i18n),
	createNotNullFilterOption(i18n),
];

export const getBooleanColumnFilterOptions = (i18n: I18nClass) => [
	'empty',
	{
		displayKey: 'true',
		displayName: i18n.baseText('dataTable.filters.true'),
		numberOfInputs: 0,
		predicate: () => true,
	},
	{
		displayKey: 'false',
		displayName: i18n.baseText('dataTable.filters.false'),
		numberOfInputs: 0,
		predicate: () => true,
	},
	createNullFilterOption(i18n),
	createNotNullFilterOption(i18n),
];
