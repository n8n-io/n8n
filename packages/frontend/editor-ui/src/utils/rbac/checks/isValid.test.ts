import { isValid } from '@/utils/rbac/checks/isValid';

describe('Checks', () => {
	describe('isValid()', () => {
		it('should return true if the provided function returns true', () => {
			const mockFn = () => true;
			expect(isValid(mockFn)).toBe(true);
		});

		it('should return false if the provided function returns false', () => {
			const mockFn = () => false;
			expect(isValid(mockFn)).toBe(false);
		});

		it('should return false if no function is provided', () => {
			expect(isValid(undefined)).toBe(false);
		});
	});
});
