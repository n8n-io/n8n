import { describe, it, expect } from 'vitest';
import { isDataTableValue, isAGGridCellType, isDataTableColumnType } from './typeGuards';

describe('dataTable typeGuards', () => {
	describe('isDataTableValue', () => {
		it('should return true for null', () => {
			expect(isDataTableValue(null)).toBe(true);
		});

		it('should return true for strings', () => {
			expect(isDataTableValue('test')).toBe(true);
			expect(isDataTableValue('')).toBe(true);
		});

		it('should return true for numbers', () => {
			expect(isDataTableValue(123)).toBe(true);
			expect(isDataTableValue(0)).toBe(true);
			expect(isDataTableValue(-1)).toBe(true);
		});

		it('should return true for booleans', () => {
			expect(isDataTableValue(true)).toBe(true);
			expect(isDataTableValue(false)).toBe(true);
		});

		it('should return true for Date objects', () => {
			expect(isDataTableValue(new Date())).toBe(true);
			expect(isDataTableValue(new Date('2024-01-01'))).toBe(true);
		});

		it('should return false for invalid values', () => {
			expect(isDataTableValue(undefined)).toBe(false);
			expect(isDataTableValue({})).toBe(false);
			expect(isDataTableValue([])).toBe(false);
			expect(isDataTableValue(Symbol('test'))).toBe(false);
		});
	});

	describe('isAGGridCellType', () => {
		it('should return true for valid AG Grid cell types', () => {
			expect(isAGGridCellType('text')).toBe(true);
			expect(isAGGridCellType('number')).toBe(true);
			expect(isAGGridCellType('boolean')).toBe(true);
			expect(isAGGridCellType('date')).toBe(true);
		});

		it('should return false for invalid cell types', () => {
			expect(isAGGridCellType('invalid')).toBe(false);
			expect(isAGGridCellType('')).toBe(false);
			expect(isAGGridCellType(null)).toBe(false);
			expect(isAGGridCellType(123)).toBe(false);
			expect(isAGGridCellType(undefined)).toBe(false);
		});
	});

	describe('isDataTableColumnType', () => {
		it('should return true for valid column types', () => {
			expect(isDataTableColumnType('string')).toBe(true);
			expect(isDataTableColumnType('number')).toBe(true);
			expect(isDataTableColumnType('boolean')).toBe(true);
			expect(isDataTableColumnType('date')).toBe(true);
		});

		it('should return false for invalid column types', () => {
			expect(isDataTableColumnType('invalid')).toBe(false);
			expect(isDataTableColumnType('')).toBe(false);
			expect(isDataTableColumnType(null)).toBe(false);
			expect(isDataTableColumnType(123)).toBe(false);
			expect(isDataTableColumnType(undefined)).toBe(false);
		});
	});
});
