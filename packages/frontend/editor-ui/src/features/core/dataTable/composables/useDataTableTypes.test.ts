import { describe, it, expect } from 'vitest';
import { useDataTableTypes } from './useDataTableTypes';

describe('useDataTableTypes', () => {
	const { getIconForType, mapToAGCellType } = useDataTableTypes();

	describe('getIconForType', () => {
		it('should return correct icon for string type', () => {
			expect(getIconForType('string')).toBe('text-aa');
		});

		it('should return correct icon for number type', () => {
			expect(getIconForType('number')).toBe('hash');
		});

		it('should return correct icon for boolean type', () => {
			expect(getIconForType('boolean')).toBe('toggles');
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
});
