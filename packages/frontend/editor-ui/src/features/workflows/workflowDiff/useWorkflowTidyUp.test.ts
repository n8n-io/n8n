import { describe, it, expect } from 'vitest';
import { shouldTidyUp } from './useWorkflowTidyUp';

describe('useWorkflowTidyUp', () => {
	describe('shouldTidyUp', () => {
		it('returns true when option is true', () => {
			expect(shouldTidyUp(true)).toBe(true);
		});

		it('returns false when option is false', () => {
			expect(shouldTidyUp(false)).toBe(false);
		});

		it('returns false when option is undefined', () => {
			expect(shouldTidyUp(undefined)).toBe(false);
		});
	});
});
