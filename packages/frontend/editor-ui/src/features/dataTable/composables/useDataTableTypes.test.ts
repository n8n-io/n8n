import { describe, it, expect } from 'vitest';
import { useDataTableTypes } from './useDataTableTypes';
import type { AGGridCellType } from '@/features/dataTable/dataTable.types';

describe('useDataTableTypes', () => {
	const { getIconForType, mapToAGCellType, mapToDataTableColumnType } = useDataTableTypes();

	describe('getIconForType', () => {
		it('should return correct icon for string type', () => {
			expect(getIconForType('string')).toBe('type');
		});

		it('should return correct icon for number type', () => {
			expect(getIconForType('number')).toBe('hash');
		});

		it('should return correct icon for boolean type', () => {
			expect(getIconForType('boolean')).toBe('square-check');
		});

		it('should return correct icon for date type', () => {
			expect(getIconForType('date')).toBe('calendar');
		});
	});

	describe('mapToAGCellType', () => {
		it('should map string to text', () => {
			expect(mapToAGCellType('string')).toBe('text');
		});

		it('should map number to number', () => {
			expect(mapToAGCellType('number')).toBe('number');
		});

		it('should map boolean to boolean', () => {
			expect(mapToAGCellType('boolean')).toBe('boolean');
		});

		it('should map date to date', () => {
			expect(mapToAGCellType('date')).toBe('date');
		});
	});

	describe('mapToDataTableColumnType', () => {
		it('should map text to string', () => {
			expect(mapToDataTableColumnType('text')).toBe('string');
		});

		it('should map number to number', () => {
			expect(mapToDataTableColumnType('number')).toBe('number');
		});

		it('should map boolean to boolean', () => {
			expect(mapToDataTableColumnType('boolean')).toBe('boolean');
		});

		it('should map date to date', () => {
			expect(mapToDataTableColumnType('date')).toBe('date');
		});

		it('should preserve dateString type', () => {
			expect(mapToDataTableColumnType('dateString')).toBe('dateString');
		});

		it('should preserve object type', () => {
			expect(mapToDataTableColumnType('object')).toBe('object');
		});

		it('should map unknown type to string', () => {
			expect(mapToDataTableColumnType('unknown' as AGGridCellType)).toBe('string');
		});
	});
});
