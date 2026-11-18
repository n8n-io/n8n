import { describe, it, expect } from 'vitest';

import { toBackendFilter } from './filterProcessors';

describe('toBackendFilter', () => {
	it('should return undefined without filters', () => {
		expect(toBackendFilter([])).toBeUndefined();
	});

	it.each([
		['contains', 'ilike', 'test'],
		['equals', 'eq', 'test'],
		['notEqual', 'neq', 'test'],
		['lessThan', 'lt', 5],
		['lessThanOrEqual', 'lte', 5],
		['greaterThan', 'gt', 5],
		['greaterThanOrEqual', 'gte', 5],
	] as const)('should map %s to %s with its value', (operator, condition, value) => {
		expect(toBackendFilter([{ field: 'col', operator, value }])).toEqual({
			type: 'and',
			filters: [{ columnName: 'col', condition, value }],
		});
	});

	it.each([
		['isEmpty', 'eq', ''],
		['notEmpty', 'neq', ''],
		['null', 'eq', null],
		['notNull', 'neq', null],
		['true', 'eq', true],
		['false', 'eq', false],
	] as const)('should map %s to %s with a fixed value', (operator, condition, value) => {
		expect(toBackendFilter([{ field: 'col', operator }])).toEqual({
			type: 'and',
			filters: [{ columnName: 'col', condition, value }],
		});
	});

	it('should map between to a gte and an lte condition', () => {
		expect(toBackendFilter([{ field: 'age', operator: 'between', value: 1, valueTo: 9 }])).toEqual({
			type: 'and',
			filters: [
				{ columnName: 'age', condition: 'gte', value: 1 },
				{ columnName: 'age', condition: 'lte', value: 9 },
			],
		});
	});

	it('should send dates as ISO strings', () => {
		const from = new Date('2026-01-01T00:00:00.000Z');
		const to = new Date('2026-02-01T00:00:00.000Z');

		expect(
			toBackendFilter([
				{ field: 'createdAt', operator: 'lessThan', value: from },
				{ field: 'updatedAt', operator: 'between', value: from, valueTo: to },
			]),
		).toEqual({
			type: 'and',
			filters: [
				{ columnName: 'createdAt', condition: 'lt', value: '2026-01-01T00:00:00.000Z' },
				{ columnName: 'updatedAt', condition: 'gte', value: '2026-01-01T00:00:00.000Z' },
				{ columnName: 'updatedAt', condition: 'lte', value: '2026-02-01T00:00:00.000Z' },
			],
		});
	});
});
