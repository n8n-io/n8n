import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref, type Ref } from 'vue';
import type { GridApi, ColDef } from 'ag-grid-community';
import { jsonParse } from 'n8n-workflow';
import { useDataTableColumnFilters } from './useDataTableColumnFilters';
import type { FilterModel, BackendFilter } from '../types/dataTableFilters.types';

describe('useDataTableColumnFilters', () => {
	let mockGridApi: Partial<GridApi>;
	let gridApiRef: Ref<GridApi>;
	let colDefsRef: Ref<ColDef[]>;

	const parseFilterJSON = (json: string | undefined): BackendFilter | undefined => {
		if (!json) return undefined;
		return jsonParse<BackendFilter>(json);
	};

	beforeEach(() => {
		mockGridApi = {
			getFilterModel: vi.fn().mockReturnValue({}),
		};
		gridApiRef = ref(mockGridApi as GridApi);
		colDefsRef = ref([
			{ field: 'name', colId: 'name' },
			{ field: 'age', colId: 'age' },
			{ field: 'createdAt', colId: 'createdAt' },
		]);
	});

	describe('initialization', () => {
		it('should initialize with undefined filter', () => {
			const { currentFilterJSON, hasActiveFilters } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			expect(currentFilterJSON.value).toBeUndefined();
			expect(hasActiveFilters.value).toBe(false);
		});
	});

	describe('text filters', () => {
		it('should process contains filter', () => {
			const filterModel: FilterModel = {
				name: { filterType: 'text', type: 'contains', filter: 'test' },
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			const result = parseFilterJSON(currentFilterJSON.value);
			expect(result).toEqual({
				type: 'and',
				filters: [{ columnName: 'name', condition: 'ilike', value: 'test' }],
			});
		});

		it('should process startsWith filter', () => {
			const filterModel: FilterModel = {
				name: { filterType: 'text', type: 'startsWith', filter: 'test' },
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			const result = parseFilterJSON(currentFilterJSON.value);
			expect(result?.filters[0]).toEqual({
				columnName: 'name',
				condition: 'ilike',
				value: 'test%',
			});
		});

		it('should process endsWith filter', () => {
			const filterModel: FilterModel = {
				name: { filterType: 'text', type: 'endsWith', filter: 'test' },
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			const result = parseFilterJSON(currentFilterJSON.value);
			expect(result?.filters[0]).toEqual({
				columnName: 'name',
				condition: 'ilike',
				value: '%test',
			});
		});

		it('should process equals filter', () => {
			const filterModel: FilterModel = {
				name: { filterType: 'text', type: 'equals', filter: 'exact' },
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			const result = parseFilterJSON(currentFilterJSON.value);
			expect(result?.filters[0]).toEqual({
				columnName: 'name',
				condition: 'eq',
				value: 'exact',
			});
		});

		it('should process notEqual filter', () => {
			const filterModel: FilterModel = {
				name: { filterType: 'text', type: 'notEqual', filter: 'test' },
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			const result = parseFilterJSON(currentFilterJSON.value);
			expect(result?.filters[0]).toEqual({
				columnName: 'name',
				condition: 'neq',
				value: 'test',
			});
		});

		it('should process isEmpty filter', () => {
			const filterModel: FilterModel = {
				name: { filterType: 'text', type: 'isEmpty' },
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			const result = parseFilterJSON(currentFilterJSON.value);
			expect(result?.filters[0]).toEqual({ columnName: 'name', condition: 'eq', value: '' });
		});

		it('should process notEmpty filter', () => {
			const filterModel: FilterModel = {
				name: { filterType: 'text', type: 'notEmpty' },
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			const result = parseFilterJSON(currentFilterJSON.value);
			expect(result?.filters[0]).toEqual({ columnName: 'name', condition: 'neq', value: '' });
		});
	});

	describe('number filters', () => {
		it('should process equals filter', () => {
			const filterModel: FilterModel = {
				age: { filterType: 'number', type: 'equals', filter: 25 },
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			const result = parseFilterJSON(currentFilterJSON.value);
			expect(result?.filters[0]).toEqual({ columnName: 'age', condition: 'eq', value: 25 });
		});

		it('should process lessThan filter', () => {
			const filterModel: FilterModel = {
				age: { filterType: 'number', type: 'lessThan', filter: 30 },
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			const result = parseFilterJSON(currentFilterJSON.value);
			expect(result?.filters[0]).toEqual({ columnName: 'age', condition: 'lt', value: 30 });
		});

		it('should process greaterThan filter', () => {
			const filterModel: FilterModel = {
				age: { filterType: 'number', type: 'greaterThan', filter: 20 },
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			const result = parseFilterJSON(currentFilterJSON.value);
			expect(result?.filters[0]).toEqual({ columnName: 'age', condition: 'gt', value: 20 });
		});

		it('should process between filter', () => {
			const filterModel: FilterModel = {
				age: { filterType: 'number', type: 'between', filter: 20, filterTo: 30 },
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			const result = parseFilterJSON(currentFilterJSON.value);
			expect(result?.filters).toEqual([
				{ columnName: 'age', condition: 'gte', value: 20 },
				{ columnName: 'age', condition: 'lte', value: 30 },
			]);
		});
	});

	describe('date filters', () => {
		it('should process equals filter', () => {
			const filterModel: FilterModel = {
				createdAt: {
					filterType: 'date',
					type: 'equals',
					dateFrom: '2024-01-01',
				},
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			const result = parseFilterJSON(currentFilterJSON.value);
			expect(result?.filters[0]).toEqual({
				columnName: 'createdAt',
				condition: 'eq',
				value: new Date('2024-01-01').toISOString(),
			});
		});

		it('should process inRange filter', () => {
			const filterModel: FilterModel = {
				createdAt: {
					filterType: 'date',
					type: 'inRange',
					dateFrom: '2024-01-01',
					dateTo: '2024-12-31',
				},
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			const result = parseFilterJSON(currentFilterJSON.value);
			expect(result?.filters).toEqual([
				{ columnName: 'createdAt', condition: 'gte', value: new Date('2024-01-01').toISOString() },
				{ columnName: 'createdAt', condition: 'lte', value: new Date('2024-12-31').toISOString() },
			]);
		});

		it('should process greaterThan filter', () => {
			const filterModel: FilterModel = {
				createdAt: {
					filterType: 'date',
					type: 'greaterThan',
					dateFrom: '2024-01-01',
				},
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			const result = parseFilterJSON(currentFilterJSON.value);
			expect(result?.filters[0]).toEqual({
				columnName: 'createdAt',
				condition: 'gt',
				value: new Date('2024-01-01').toISOString(),
			});
		});
	});

	describe('multiple filters', () => {
		it('should process multiple filters from different columns', () => {
			const filterModel: FilterModel = {
				name: { filterType: 'text', type: 'contains', filter: 'john' },
				age: { filterType: 'number', type: 'greaterThan', filter: 25 },
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			const result = parseFilterJSON(currentFilterJSON.value);
			expect(result?.type).toBe('and');
			expect(result?.filters).toHaveLength(2);
			expect(result?.filters).toContainEqual({
				columnName: 'name',
				condition: 'ilike',
				value: 'john',
			});
			expect(result?.filters).toContainEqual({ columnName: 'age', condition: 'gt', value: 25 });
		});
	});

	describe('colId to field mapping', () => {
		it('should map colId to field correctly', () => {
			colDefsRef.value = [{ field: 'userName', colId: 'user_name_col' }];
			const filterModel: FilterModel = {
				user_name_col: { filterType: 'text', type: 'contains', filter: 'test' },
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			const result = parseFilterJSON(currentFilterJSON.value);
			expect(result?.filters[0].columnName).toBe('userName');
		});

		it('should use field as colId if colId is not provided', () => {
			colDefsRef.value = [{ field: 'name' }];
			const filterModel: FilterModel = {
				name: { filterType: 'text', type: 'contains', filter: 'test' },
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			const result = parseFilterJSON(currentFilterJSON.value);
			expect(result?.filters[0].columnName).toBe('name');
		});
	});

	describe('hasActiveFilters', () => {
		it('should return false when no filters are active', () => {
			mockGridApi.getFilterModel = vi.fn().mockReturnValue({});

			const { onFilterChanged, hasActiveFilters } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			expect(hasActiveFilters.value).toBe(false);
		});

		it('should return true when filters are active', () => {
			const filterModel: FilterModel = {
				name: { filterType: 'text', type: 'contains', filter: 'test' },
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, hasActiveFilters } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			expect(hasActiveFilters.value).toBe(true);
		});

		it('should update when filters are cleared', () => {
			const filterModel: FilterModel = {
				name: { filterType: 'text', type: 'contains', filter: 'test' },
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, hasActiveFilters } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();
			expect(hasActiveFilters.value).toBe(true);

			mockGridApi.getFilterModel = vi.fn().mockReturnValue({});
			onFilterChanged();
			expect(hasActiveFilters.value).toBe(false);
		});
	});

	describe('edge cases', () => {
		it('should return undefined when filter model is empty', () => {
			mockGridApi.getFilterModel = vi.fn().mockReturnValue({});

			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			expect(currentFilterJSON.value).toBeUndefined();
		});

		it('should skip filters without filterType', () => {
			const filterModel: FilterModel = {
				name: { type: 'contains', filter: 'test' },
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			expect(currentFilterJSON.value).toBeUndefined();
		});

		it('should handle unknown filter types gracefully', () => {
			const filterModel: FilterModel = {
				name: { filterType: 'unknown' as 'text', type: 'contains', filter: 'test' },
			};
			mockGridApi.getFilterModel = vi.fn().mockReturnValue(filterModel);

			const { onFilterChanged, currentFilterJSON } = useDataTableColumnFilters({
				gridApi: gridApiRef,
				colDefs: colDefsRef,
			});

			onFilterChanged();

			expect(currentFilterJSON.value).toBeUndefined();
		});
	});
});
