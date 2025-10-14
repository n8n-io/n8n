import { describe, it, expect, vi } from 'vitest';
import type {
	CellClassParams,
	ICellRendererParams,
	ValueGetterParams,
	ValueSetterParams,
	CellEditRequestEvent,
	ValueFormatterParams,
} from 'ag-grid-community';
import { ref } from 'vue';
import type { I18nClass } from '@n8n/i18n';
import type { DataTableColumn, DataTableRow } from '@/features/dataTable/dataTable.types';
import {
	getCellClass,
	createValueGetter,
	createCellRendererSelector,
	createStringValueSetter,
	stringCellEditorParams,
	dateValueFormatter,
	numberValueFormatter,
	getStringColumnFilterOptions,
	getBooleanColumnFilterOptions,
	getNumberColumnFilterOptions,
	getDateColumnFilterOptions,
} from './columnUtils';
import { ADD_ROW_ROW_ID, NULL_VALUE, EMPTY_VALUE } from '@/features/dataTable/constants';
import NullEmptyCellRenderer from '@/features/dataTable/components/dataGrid/NullEmptyCellRenderer.vue';

describe('columnUtils', () => {
	let mockI18n: I18nClass;

	beforeEach(() => {
		mockI18n = {
			baseText: vi.fn((key: string) => key),
		} as unknown as I18nClass;
	});

	describe('getCellClass', () => {
		it('should return "add-row-cell" for add row', () => {
			const params = {
				data: { id: ADD_ROW_ROW_ID },
				column: {
					getUserProvidedColDef: () => ({}),
				},
			} as unknown as CellClassParams;

			expect(getCellClass(params)).toBe('add-row-cell');
		});

		it('should return "boolean-cell" for boolean columns', () => {
			const params = {
				data: { id: 1 },
				column: {
					getUserProvidedColDef: () => ({ cellDataType: 'boolean' }),
				},
			} as unknown as CellClassParams;

			expect(getCellClass(params)).toBe('boolean-cell');
		});

		it('should return empty string for regular cells', () => {
			const params = {
				data: { id: 1 },
				column: {
					getUserProvidedColDef: () => ({ cellDataType: 'text' }),
				},
			} as unknown as CellClassParams;

			expect(getCellClass(params)).toBe('');
		});
	});

	describe('createValueGetter', () => {
		it('should return null for undefined values', () => {
			const col: DataTableColumn = { id: 'col1', name: 'test', type: 'string', index: 0 };
			const params = { data: {} } as unknown as ValueGetterParams<DataTableRow>;

			const getter = createValueGetter(col);
			expect(getter(params)).toBeNull();
		});

		it('should return null for null values', () => {
			const col: DataTableColumn = { id: 'col1', name: 'test', type: 'string', index: 0 };
			const params = { data: { test: null } } as unknown as ValueGetterParams<DataTableRow>;

			const getter = createValueGetter(col);
			expect(getter(params)).toBeNull();
		});

		it('should return value for string columns', () => {
			const col: DataTableColumn = { id: 'col1', name: 'test', type: 'string', index: 0 };
			const params = { data: { test: 'hello' } } as unknown as ValueGetterParams<DataTableRow>;

			const getter = createValueGetter(col);
			expect(getter(params)).toBe('hello');
		});

		it('should convert string to Date for date columns', () => {
			const col: DataTableColumn = { id: 'col1', name: 'date', type: 'date', index: 0 };
			const params = {
				data: { date: '2024-01-01T00:00:00.000Z' },
			} as unknown as ValueGetterParams<DataTableRow>;

			const getter = createValueGetter(col);
			const result = getter(params);
			expect(result).toBeInstanceOf(Date);
			expect((result as Date).toISOString()).toBe('2024-01-01T00:00:00.000Z');
		});

		it('should return value as-is for non-string date values', () => {
			const col: DataTableColumn = { id: 'col1', name: 'date', type: 'date', index: 0 };
			const date = new Date('2024-01-01');
			const params = { data: { date } } as unknown as ValueGetterParams<DataTableRow>;

			const getter = createValueGetter(col);
			expect(getter(params)).toBe(date);
		});
	});

	describe('createCellRendererSelector', () => {
		it('should return empty object for add row cells', () => {
			const col: DataTableColumn = { id: 'col1', name: 'test', type: 'string', index: 0 };
			const params = { data: { id: ADD_ROW_ROW_ID } } as ICellRendererParams;

			const selector = createCellRendererSelector(col);
			expect(selector(params)).toEqual({});
		});

		it('should return empty object for add column', () => {
			const col: DataTableColumn = { id: 'add-column', name: 'test', type: 'string', index: 0 };
			const params = { data: { id: 1 } } as ICellRendererParams;

			const selector = createCellRendererSelector(col);
			expect(selector(params)).toEqual({});
		});

		it('should return NullEmptyCellRenderer for null values', () => {
			const col: DataTableColumn = { id: 'col1', name: 'test', type: 'string', index: 0 };
			const params = { data: { test: null } } as ICellRendererParams;

			const selector = createCellRendererSelector(col);
			const result = selector(params);
			expect(result).toEqual({
				component: NullEmptyCellRenderer,
				params: { value: NULL_VALUE },
			});
		});

		it('should return NullEmptyCellRenderer for undefined values', () => {
			const col: DataTableColumn = { id: 'col1', name: 'test', type: 'string', index: 0 };
			const params = { data: {} } as ICellRendererParams;

			const selector = createCellRendererSelector(col);
			const result = selector(params);
			expect(result).toEqual({
				component: NullEmptyCellRenderer,
				params: { value: NULL_VALUE },
			});
		});

		it('should return NullEmptyCellRenderer for empty strings', () => {
			const col: DataTableColumn = { id: 'col1', name: 'test', type: 'string', index: 0 };
			const params = { data: { test: '' } } as ICellRendererParams;

			const selector = createCellRendererSelector(col);
			const result = selector(params);
			expect(result).toEqual({
				component: NullEmptyCellRenderer,
				params: { value: EMPTY_VALUE },
			});
		});

		it('should return undefined for regular values', () => {
			const col: DataTableColumn = { id: 'col1', name: 'test', type: 'string', index: 0 };
			const params = { data: { test: 'value' } } as ICellRendererParams;

			const selector = createCellRendererSelector(col);
			expect(selector(params)).toBeUndefined();
		});
	});

	describe('createStringValueSetter', () => {
		it('should set new value for valid strings', () => {
			const col: DataTableColumn = { id: 'col1', name: 'test', type: 'string', index: 0 };
			const isTextEditorOpen = ref(false);
			const data = { test: 'old' };
			const params = {
				data,
				newValue: 'new',
			} as unknown as ValueSetterParams<DataTableRow>;

			const setter = createStringValueSetter(col, isTextEditorOpen);
			expect(setter(params)).toBe(true);
			expect(data.test).toBe('new');
		});

		it('should return false for invalid values', () => {
			const col: DataTableColumn = { id: 'col1', name: 'test', type: 'string', index: 0 };
			const isTextEditorOpen = ref(false);
			const data = { test: 'old' };
			const params = {
				data,
				newValue: {},
			} as unknown as ValueSetterParams<DataTableRow>;

			const setter = createStringValueSetter(col, isTextEditorOpen);
			expect(setter(params)).toBe(false);
		});

		it('should return false when original is null and new is empty string', () => {
			const col: DataTableColumn = { id: 'col1', name: 'test', type: 'string', index: 0 };
			const isTextEditorOpen = ref(false);
			const data = {};
			const params = {
				data,
				newValue: '',
			} as unknown as ValueSetterParams<DataTableRow>;

			const setter = createStringValueSetter(col, isTextEditorOpen);
			expect(setter(params)).toBe(false);
		});

		it('should convert null to empty string when text editor is open', () => {
			const col: DataTableColumn = { id: 'col1', name: 'test', type: 'string', index: 0 };
			const isTextEditorOpen = ref(true);
			const data = { test: 'old' };
			const params = {
				data,
				newValue: null,
			} as unknown as ValueSetterParams<DataTableRow>;

			const setter = createStringValueSetter(col, isTextEditorOpen);
			expect(setter(params)).toBe(true);
			expect(data.test).toBe('');
		});
	});

	describe('stringCellEditorParams', () => {
		it('should return value and maxLength for string value', () => {
			const params = {
				value: 'test',
			} as CellEditRequestEvent<DataTableRow>;

			const result = stringCellEditorParams(params);
			expect(result).toEqual({
				value: 'test',
				maxLength: 999999999,
			});
		});

		it('should return empty string for null value', () => {
			const params = {
				value: null,
			} as CellEditRequestEvent<DataTableRow>;

			const result = stringCellEditorParams(params);
			expect(result).toEqual({
				value: '',
				maxLength: 999999999,
			});
		});

		it('should return empty string for undefined value', () => {
			const params = {
				value: undefined,
			} as CellEditRequestEvent<DataTableRow>;

			const result = stringCellEditorParams(params);
			expect(result).toEqual({
				value: '',
				maxLength: 999999999,
			});
		});
	});

	describe('dateValueFormatter', () => {
		it('should format Date to ISO string', () => {
			const date = new Date('2024-01-01T12:00:00.000Z');
			const params = {
				value: date,
			} as unknown as ValueFormatterParams<DataTableRow, Date | null | undefined>;

			const result = dateValueFormatter(params);
			expect(result).toBe('2024-01-01T12:00:00.000+00:00');
		});

		it('should return empty string for null', () => {
			const params = {
				value: null,
			} as unknown as ValueFormatterParams<DataTableRow, Date | null | undefined>;

			const result = dateValueFormatter(params);
			expect(result).toBe('');
		});

		it('should return empty string for undefined', () => {
			const params = {
				value: undefined,
			} as unknown as ValueFormatterParams<DataTableRow, Date | null | undefined>;

			const result = dateValueFormatter(params);
			expect(result).toBe('');
		});
	});

	describe('numberValueFormatter', () => {
		it('should format number with thousand separators', () => {
			const params = {
				value: 1234567,
			} as unknown as ValueFormatterParams<DataTableRow, number | null | undefined>;

			const result = numberValueFormatter(params);
			expect(result).toBe('1 234 567');
		});

		it('should format number with decimals', () => {
			const params = {
				value: 1234.56,
			} as unknown as ValueFormatterParams<DataTableRow, number | null | undefined>;

			const result = numberValueFormatter(params);
			expect(result).toBe('1 234.56');
		});

		it('should return empty string for null', () => {
			const params = {
				value: null,
			} as unknown as ValueFormatterParams<DataTableRow, number | null | undefined>;

			const result = numberValueFormatter(params);
			expect(result).toBe('');
		});

		it('should return empty string for undefined', () => {
			const params = {
				value: undefined,
			} as unknown as ValueFormatterParams<DataTableRow, number | null | undefined>;

			const result = numberValueFormatter(params);
			expect(result).toBe('');
		});
	});

	describe('getStringColumnFilterOptions', () => {
		it('should return array of filter options', () => {
			const options = getStringColumnFilterOptions(mockI18n);

			expect(options).toHaveLength(7);
		});
	});

	describe('getBooleanColumnFilterOptions', () => {
		it('should return array of filter options', () => {
			const options = getBooleanColumnFilterOptions(mockI18n);

			expect(options).toHaveLength(5);
		});
	});

	describe('getNumberColumnFilterOptions', () => {
		it('should return array of filter options', () => {
			const options = getNumberColumnFilterOptions(mockI18n);

			expect(options).toHaveLength(9);
		});
	});

	describe('getDateColumnFilterOptions', () => {
		it('should return array of filter options', () => {
			const options = getDateColumnFilterOptions(mockI18n);
			expect(options).toHaveLength(9);
		});
	});
});
