import type { FilterModel, IFilterOptionDef } from 'ag-grid-community';

import { toDate, toLocalDateTimeString, toText } from './cellValues';
import type {
	DataGridColumn,
	DataGridColumnType,
	DataGridFilter,
	DataGridFilterOperator,
	DataGridFilterValue,
	DataGridRow,
} from './DataGrid.types';

type FilterMode = 'client' | 'server';
type Predicate = (filterValues: unknown[], cellValue: unknown) => boolean;

type AgConditionModel = {
	filterType?: string;
	type?: string;
	filter?: string | number | null;
	filterTo?: string | number | null;
	dateFrom?: string | null;
	dateTo?: string | null;
};

const RANGE_OPERATORS: DataGridFilterOperator[] = [
	'equals',
	'notEqual',
	'lessThan',
	'lessThanOrEqual',
	'greaterThan',
	'greaterThanOrEqual',
	'between',
	'null',
	'notNull',
];

export const FILTER_OPERATORS: Record<DataGridColumnType, DataGridFilterOperator[]> = {
	['string']: ['contains', 'equals', 'notEqual', 'isEmpty', 'notEmpty', 'null', 'notNull'],
	['number']: RANGE_OPERATORS,
	date: RANGE_OPERATORS,
	['boolean']: ['true', 'false', 'null', 'notNull'],
	json: [],
};

const AG_FILTER_BY_TYPE: Record<DataGridColumnType, string | undefined> = {
	['string']: 'agTextColumnFilter',
	['boolean']: 'agTextColumnFilter',
	['number']: 'agNumberColumnFilter',
	date: 'agDateColumnFilter',
	json: undefined,
};

const AG_MODEL_TYPE: Record<DataGridColumnType, 'text' | 'number' | 'date'> = {
	['string']: 'text',
	['boolean']: 'text',
	['number']: 'number',
	date: 'date',
	json: 'text',
};

const NO_INPUT_OPERATORS: DataGridFilterOperator[] = [
	'isEmpty',
	'notEmpty',
	'null',
	'notNull',
	'true',
	'false',
];

const numberOfInputs = (operator: DataGridFilterOperator): 0 | 1 | 2 => {
	if (operator === 'between') return 2;
	return NO_INPUT_OPERATORS.includes(operator) ? 0 : 1;
};

const isMissing = (value: unknown) => value === null || value === undefined;

const toComparable = (value: unknown, type: DataGridColumnType): number | string | undefined => {
	if (isMissing(value)) return undefined;
	if (type === 'date') return toDate(value)?.getTime();
	if (type === 'number') return typeof value === 'number' ? value : Number(value);
	return toText(value).toLowerCase();
};

const createCompare =
	(type: DataGridColumnType, test: (cell: number | string, filter: number | string) => boolean) =>
	(filterValues: unknown[], cellValue: unknown) => {
		const cell = toComparable(cellValue, type);
		const filter = toComparable(filterValues[0], type);
		return cell !== undefined && filter !== undefined && test(cell, filter);
	};

const createPredicate = (operator: DataGridFilterOperator, type: DataGridColumnType): Predicate => {
	switch (operator) {
		case 'contains':
			return createCompare(type, (cell, filter) => String(cell).includes(String(filter)));
		case 'equals':
			return createCompare(type, (cell, filter) => cell === filter);
		case 'notEqual': {
			const equals = createPredicate('equals', type);
			return (filterValues, cellValue) => !equals(filterValues, cellValue);
		}
		case 'lessThan':
			return createCompare(type, (cell, filter) => cell < filter);
		case 'lessThanOrEqual':
			return createCompare(type, (cell, filter) => cell <= filter);
		case 'greaterThan':
			return createCompare(type, (cell, filter) => cell > filter);
		case 'greaterThanOrEqual':
			return createCompare(type, (cell, filter) => cell >= filter);
		case 'between':
			return (filterValues, cellValue) => {
				const cell = toComparable(cellValue, type);
				const from = toComparable(filterValues[0], type);
				const to = toComparable(filterValues[1], type);
				return cell !== undefined && from !== undefined && to !== undefined
					? cell >= from && cell <= to
					: false;
			};
		case 'isEmpty':
			return (_, cellValue) => cellValue === '';
		case 'notEmpty':
			return (_, cellValue) => cellValue !== '';
		case 'null':
			return (_, cellValue) => isMissing(cellValue);
		case 'notNull':
			return (_, cellValue) => !isMissing(cellValue);
		case 'true':
			return (_, cellValue) => cellValue === true || cellValue === 'true';
		case 'false':
			return (_, cellValue) => cellValue === false || cellValue === 'false';
	}
};

const passAll: Predicate = () => true;

/** Checks a cell value against a filter, with the same rules as client filter mode. */
export const matchesDataGridFilter = (
	value: unknown,
	filter: DataGridFilter,
	type: DataGridColumnType,
): boolean =>
	isFilterOperator(type, filter.operator) &&
	createPredicate(filter.operator, type)([filter.value, filter.valueTo], value);

export const getAgFilter = (type: DataGridColumnType) => AG_FILTER_BY_TYPE[type];

const AG_PLACEHOLDER_OPTION = 'empty';

export const getAgFilterOptions = (
	type: DataGridColumnType,
	mode: FilterMode,
	translate: (key: string) => string,
): Array<IFilterOptionDef | typeof AG_PLACEHOLDER_OPTION> => {
	const operators = FILTER_OPERATORS[type];
	const options = operators.map(
		(operator): IFilterOptionDef => ({
			displayKey: operator,
			displayName: translate(`dataGrid.filter.${operator}`),
			numberOfInputs: numberOfInputs(operator),
			predicate: mode === 'client' ? createPredicate(operator, type) : passAll,
		}),
	);
	const appliesWithoutInput = operators.length > 0 && numberOfInputs(operators[0]) === 0;
	return appliesWithoutInput ? [AG_PLACEHOLDER_OPTION, ...options] : options;
};

const isFilterOperator = (
	type: DataGridColumnType,
	value: unknown,
): value is DataGridFilterOperator =>
	typeof value === 'string' && (FILTER_OPERATORS[type] as string[]).includes(value);

const toFilterValue = (
	condition: AgConditionModel,
	type: DataGridColumnType,
	key: 'from' | 'to',
): DataGridFilterValue | undefined => {
	if (type === 'date') {
		const date = key === 'from' ? condition.dateFrom : condition.dateTo;
		return isMissing(date) ? undefined : toDate(date);
	}
	const value = key === 'from' ? condition.filter : condition.filterTo;
	return isMissing(value) ? undefined : value;
};

export const toDataGridFilters = <TRow extends DataGridRow>(
	model: FilterModel,
	columns: Array<DataGridColumn<TRow>>,
): DataGridFilter[] =>
	columns.flatMap((column) => {
		const condition: AgConditionModel | undefined = model[column.id];
		if (!condition || !isFilterOperator(column.type, condition.type)) return [];

		const operator = condition.type;
		const filter: DataGridFilter = { field: column.field, operator };
		if (numberOfInputs(operator) > 0) {
			filter.value = toFilterValue(condition, column.type, 'from');
		}
		if (numberOfInputs(operator) > 1) {
			filter.valueTo = toFilterValue(condition, column.type, 'to');
		}
		return [filter];
	});

const toAgDate = (value: DataGridFilterValue | undefined) => {
	const date = toDate(value);
	return date ? toLocalDateTimeString(date) : null;
};

const toAgScalar = (value: DataGridFilterValue | undefined) => {
	if (isMissing(value)) return null;
	return typeof value === 'number' ? value : String(value);
};

const toAgCondition = (filter: DataGridFilter, type: DataGridColumnType): AgConditionModel =>
	type === 'date'
		? {
				filterType: 'date',
				type: filter.operator,
				dateFrom: toAgDate(filter.value),
				dateTo: toAgDate(filter.valueTo),
			}
		: {
				filterType: AG_MODEL_TYPE[type],
				type: filter.operator,
				filter: toAgScalar(filter.value),
				filterTo: toAgScalar(filter.valueTo),
			};

export const toAgFilterModel = <TRow extends DataGridRow>(
	filters: DataGridFilter[],
	columns: Array<DataGridColumn<TRow>>,
): FilterModel =>
	Object.fromEntries(
		filters.flatMap((filter) => {
			const column = columns.find((col) => col.field === filter.field);
			return column ? [[column.id, toAgCondition(filter, column.type)]] : [];
		}),
	);
