import { describe, it, expect, vi } from 'vitest';
import { processTextFilter, processNumberFilter, processDateFilter } from './filterProcessors';
import type { FilterModel, FilterOperation } from '../types/dataTableFilters.types';

vi.mock('./filterMappings', () => ({
	mapTextTypeToBackend: vi.fn((type: string) => {
		const mapping: Record<string, string> = {
			contains: 'ilike',
			equals: 'eq',
			notEqual: 'neq',
			startsWith: 'ilike',
			endsWith: 'ilike',
			isEmpty: 'eq',
			notEmpty: 'neq',
			null: 'eq',
			notNull: 'neq',
			true: 'eq',
			false: 'eq',
		};
		return mapping[type] || 'unknown';
	}),
	mapNumberDateTypeToBackend: vi.fn((type: string) => {
		const mapping: Record<string, string> = {
			equals: 'eq',
			notEqual: 'neq',
			lessThan: 'lt',
			lessThanOrEqual: 'lte',
			greaterThan: 'gt',
			greaterThanOrEqual: 'gte',
			null: 'eq',
			notNull: 'neq',
		};
		return mapping[type] || 'unknown';
	}),
}));

describe('filterProcessors', () => {
	describe('processTextFilter', () => {
		const createTextFilter = (type: FilterOperation, filter?: string): FilterModel[string] => ({
			filterType: 'text',
			type,
			filter,
		});

		it('should process contains filter', () => {
			const filter = createTextFilter('contains', 'test');
			const result = processTextFilter(filter, 'columnName');

			expect(result).toEqual({
				columnName: 'columnName',
				condition: 'ilike',
				value: 'test',
			});
		});

		it('should process startsWith filter with % suffix', () => {
			const filter = createTextFilter('startsWith', 'test');
			const result = processTextFilter(filter, 'columnName');

			expect(result).toEqual({
				columnName: 'columnName',
				condition: 'ilike',
				value: 'test%',
			});
		});

		it('should process endsWith filter with % prefix', () => {
			const filter = createTextFilter('endsWith', 'test');
			const result = processTextFilter(filter, 'columnName');

			expect(result).toEqual({
				columnName: 'columnName',
				condition: 'ilike',
				value: '%test',
			});
		});

		it('should process isEmpty filter with empty string value', () => {
			const filter = createTextFilter('isEmpty');
			const result = processTextFilter(filter, 'columnName');

			expect(result).toEqual({
				columnName: 'columnName',
				condition: 'eq',
				value: '',
			});
		});

		it('should process notEmpty filter with empty string value', () => {
			const filter = createTextFilter('notEmpty');
			const result = processTextFilter(filter, 'columnName');

			expect(result).toEqual({
				columnName: 'columnName',
				condition: 'neq',
				value: '',
			});
		});

		it('should process null filter', () => {
			const filter = createTextFilter('null');
			const result = processTextFilter(filter, 'columnName');

			expect(result).toEqual({
				columnName: 'columnName',
				condition: 'eq',
				value: null,
			});
		});

		it('should process boolean true filter', () => {
			const filter = createTextFilter('true');
			const result = processTextFilter(filter, 'columnName');

			expect(result).toEqual({
				columnName: 'columnName',
				condition: 'eq',
				value: true,
			});
		});

		it('should process boolean false filter', () => {
			const filter = createTextFilter('false');
			const result = processTextFilter(filter, 'columnName');

			expect(result).toEqual({
				columnName: 'columnName',
				condition: 'eq',
				value: false,
			});
		});
	});

	describe('processNumberFilter', () => {
		const createNumberFilter = (
			type: FilterOperation,
			filter?: string,
			filterTo?: string,
		): FilterModel[string] => ({
			filterType: 'number',
			type,
			filter,
			filterTo,
		});

		it('should process equals filter', () => {
			const filter = createNumberFilter('equals', '42');
			const result = processNumberFilter(filter, 'columnName');

			expect(result).toEqual([
				{
					columnName: 'columnName',
					condition: 'eq',
					value: '42',
				},
			]);
		});

		it('should process greaterThan filter', () => {
			const filter = createNumberFilter('greaterThan', '100');
			const result = processNumberFilter(filter, 'columnName');

			expect(result).toEqual([
				{
					columnName: 'columnName',
					condition: 'gt',
					value: '100',
				},
			]);
		});

		it('should process null filter with null value', () => {
			const filter = createNumberFilter('null');
			const result = processNumberFilter(filter, 'columnName');

			expect(result).toEqual([
				{
					columnName: 'columnName',
					condition: 'eq',
					value: null,
				},
			]);
		});

		it('should process notNull filter with null value', () => {
			const filter = createNumberFilter('notNull');
			const result = processNumberFilter(filter, 'columnName');

			expect(result).toEqual([
				{
					columnName: 'columnName',
					condition: 'neq',
					value: null,
				},
			]);
		});

		it('should process between filter', () => {
			const filter = createNumberFilter('between', '100', '200');
			const result = processNumberFilter(filter, 'columnName');

			expect(result).toEqual([
				{ columnName: 'columnName', condition: 'gte', value: '100' },
				{ columnName: 'columnName', condition: 'lte', value: '200' },
			]);
		});
	});

	describe('processDateFilter', () => {
		const createDateFilter = (
			type: FilterOperation,
			dateFrom?: string,
			dateTo?: string,
		): FilterModel[string] => ({
			filterType: 'date',
			type,
			dateFrom,
			dateTo,
		});

		it('should process equals filter with dateFrom', () => {
			const filter = createDateFilter('equals', '2023-12-01');
			const result = processDateFilter(filter, 'columnName');

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				columnName: 'columnName',
				condition: 'eq',
				value: new Date('2023-12-01').toISOString(),
			});
		});

		it('should process inRange filter with two filters', () => {
			const filter = createDateFilter('inRange', '2023-12-01', '2023-12-31');
			const result = processDateFilter(filter, 'columnName');

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				columnName: 'columnName',
				condition: 'gte',
				value: new Date('2023-12-01').toISOString(),
			});
			expect(result[1]).toEqual({
				columnName: 'columnName',
				condition: 'lte',
				value: new Date('2023-12-31').toISOString(),
			});
		});

		it('should process null filter', () => {
			const filter = createDateFilter('null');
			const result = processDateFilter(filter, 'columnName');

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				columnName: 'columnName',
				condition: 'eq',
				value: null,
			});
		});

		it('should process notNull filter', () => {
			const filter = createDateFilter('notNull');
			const result = processDateFilter(filter, 'columnName');

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				columnName: 'columnName',
				condition: 'neq',
				value: null,
			});
		});

		it('should process greaterThan filter', () => {
			const filter = createDateFilter('greaterThan', '2023-12-01');
			const result = processDateFilter(filter, 'columnName');

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				columnName: 'columnName',
				condition: 'gt',
				value: new Date('2023-12-01').toISOString(),
			});
		});

		it('should handle missing dateFrom gracefully', () => {
			const filter = createDateFilter('equals');
			const result = processDateFilter(filter, 'columnName');

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				columnName: 'columnName',
				condition: 'eq',
				value: null,
			});
		});
	});
});
