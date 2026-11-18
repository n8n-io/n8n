import type { IFilterOptionDef } from 'ag-grid-community';

import type { DataGridColumn, DataGridColumnType, DataGridFilterOperator } from './DataGrid.types';
import {
	FILTER_OPERATORS,
	getAgFilterOptions,
	toAgFilterModel,
	toDataGridFilters,
} from './filters';

type Row = { name: string; age: number; birthday: string; active: boolean };

const columns: Array<DataGridColumn<Row>> = [
	{ id: 'name-id', field: 'name', label: 'Name', type: 'string' },
	{ id: 'age-id', field: 'age', label: 'Age', type: 'number' },
	{ id: 'birthday-id', field: 'birthday', label: 'Birthday', type: 'date' },
	{ id: 'active-id', field: 'active', label: 'Active', type: 'boolean' },
];

const translate = (key: string) => key;

const getPredicate = (
	type: DataGridColumnType,
	operator: DataGridFilterOperator,
	mode: 'client' | 'server' = 'client',
) => {
	const option = getAgFilterOptions(type, mode, translate).find(
		(item): item is IFilterOptionDef => typeof item !== 'string' && item.displayKey === operator,
	);
	if (!option?.predicate) throw new Error(`No predicate for ${operator}`);
	return option.predicate;
};

describe('getAgFilterOptions', () => {
	const getOptionDefs = (type: DataGridColumnType) =>
		getAgFilterOptions(type, 'client', translate).filter(
			(option): option is IFilterOptionDef => typeof option !== 'string',
		);

	it('should offer the operators of each column type with translated labels', () => {
		const options = getOptionDefs('string');

		expect(options.map((option) => option.displayKey)).toEqual(FILTER_OPERATORS.string);
		expect(options[0].displayName).toBe('dataGrid.filter.contains');
	});

	it('should start with a placeholder when the first operator needs no input', () => {
		expect(getAgFilterOptions('boolean', 'client', translate)[0]).toBe('empty');
		expect(getAgFilterOptions('number', 'client', translate)[0]).not.toBe('empty');
	});

	it('should set the number of inputs for each operator', () => {
		const inputs = Object.fromEntries(
			getOptionDefs('number').map((option) => [option.displayKey, option.numberOfInputs]),
		);

		expect(inputs).toMatchObject({ equals: 1, between: 2, null: 0, notNull: 0 });
	});

	it('should let every row pass in server mode', () => {
		expect(getPredicate('string', 'contains', 'server')(['x'], 'abc')).toBe(true);
		expect(getPredicate('number', 'greaterThan', 'server')([10], 1)).toBe(true);
	});
});

describe('client filter predicates', () => {
	it.each([
		['contains', ['LIC'], 'Alice', true],
		['contains', ['bob'], 'Alice', false],
		['equals', ['alice'], 'Alice', true],
		['notEqual', ['alice'], 'Alice', false],
		['notEqual', ['bob'], 'Alice', true],
		['isEmpty', [], '', true],
		['isEmpty', [], 'a', false],
		['notEmpty', [], 'a', true],
		['null', [], null, true],
		['null', [], 'a', false],
		['notNull', [], 'a', true],
	] as const)('should apply string %s %j to %j', (operator, values, cell, expected) => {
		expect(getPredicate('string', operator)([...values], cell)).toBe(expected);
	});

	it.each([
		['equals', [5], 5, true],
		['lessThan', [5], 4, true],
		['lessThan', [5], 5, false],
		['lessThanOrEqual', [5], 5, true],
		['greaterThan', [5], 6, true],
		['greaterThanOrEqual', [5], 4, false],
		['between', [1, 3], 2, true],
		['between', [1, 3], 4, false],
		['greaterThan', [5], null, false],
	] as const)('should apply number %s %j to %j', (operator, values, cell, expected) => {
		expect(getPredicate('number', operator)([...values], cell)).toBe(expected);
	});

	it('should compare dates by time', () => {
		const filter = new Date('2026-01-01T00:00:00Z');

		expect(getPredicate('date', 'greaterThan')([filter], new Date('2026-06-01T00:00:00Z'))).toBe(
			true,
		);
		expect(getPredicate('date', 'equals')([filter], new Date('2026-01-01T00:00:00Z'))).toBe(true);
	});

	it('should match booleans and their text form', () => {
		expect(getPredicate('boolean', 'true')([], true)).toBe(true);
		expect(getPredicate('boolean', 'true')([], 'true')).toBe(true);
		expect(getPredicate('boolean', 'false')([], true)).toBe(false);
	});
});

describe('filter model conversion', () => {
	it('should convert an AG Grid filter model to data grid filters', () => {
		const filters = toDataGridFilters(
			{
				'name-id': { filterType: 'text', type: 'contains', filter: 'al' },
				'age-id': { filterType: 'number', type: 'between', filter: 1, filterTo: 9 },
				'active-id': { filterType: 'text', type: 'true' },
				'birthday-id': { filterType: 'date', type: 'lessThan', dateFrom: '2026-01-02 03:04:05' },
			},
			columns,
		);

		expect(filters).toEqual([
			{ field: 'name', operator: 'contains', value: 'al' },
			{ field: 'age', operator: 'between', value: 1, valueTo: 9 },
			{ field: 'birthday', operator: 'lessThan', value: new Date(2026, 0, 2, 3, 4, 5) },
			{ field: 'active', operator: 'true' },
		]);
	});

	it('should ignore operators that the column type does not have', () => {
		expect(
			toDataGridFilters(
				{ 'age-id': { filterType: 'number', type: 'contains', filter: 1 } },
				columns,
			),
		).toEqual([]);
	});

	it('should convert data grid filters back to the same AG Grid filter model', () => {
		const model = {
			'name-id': { filterType: 'text', type: 'contains', filter: 'al', filterTo: null },
			'age-id': { filterType: 'number', type: 'between', filter: 1, filterTo: 9 },
			'birthday-id': {
				filterType: 'date',
				type: 'lessThan',
				dateFrom: '2026-01-02 03:04:05',
				dateTo: null,
			},
		};

		expect(toAgFilterModel(toDataGridFilters(model, columns), columns)).toEqual(model);
	});

	it('should skip filters on unknown fields', () => {
		expect(toAgFilterModel([{ field: 'unknown', operator: 'equals', value: 1 }], columns)).toEqual(
			{},
		);
	});
});
