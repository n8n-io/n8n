/**
 * Tests for WarningTracker class
 */

import type { ValidationWarning } from '../../types';
import { WarningTracker } from '../warning-tracker';

describe('WarningTracker', () => {
	let tracker: WarningTracker;

	beforeEach(() => {
		tracker = new WarningTracker();
	});

	describe('filterNewWarnings', () => {
		it('should return all warnings when none have been seen', () => {
			const warnings: ValidationWarning[] = [
				{ code: 'WARN001', message: 'Warning 1' },
				{ code: 'WARN002', message: 'Warning 2' },
			];

			const result = tracker.filterNewWarnings(warnings);
			expect(result).toEqual(warnings);
		});

		it('should filter out previously seen warnings', () => {
			const warning1: ValidationWarning = { code: 'WARN001', message: 'Warning 1' };
			const warning2: ValidationWarning = { code: 'WARN002', message: 'Warning 2' };

			tracker.markAsSeen([warning1]);

			const result = tracker.filterNewWarnings([warning1, warning2]);
			expect(result).toEqual([warning2]);
		});

		it('should use code|nodeName|parameterPath as deduplication key', () => {
			const warning1: ValidationWarning = {
				code: 'WARN001',
				message: 'Old message',
				nodeName: 'Node1',
				parameterPath: 'path.to.param',
			};

			const warning2: ValidationWarning = {
				code: 'WARN001',
				message: 'New message', // Different message but same key
				nodeName: 'Node1',
				parameterPath: 'path.to.param',
			};

			tracker.markAsSeen([warning1]);

			const result = tracker.filterNewWarnings([warning2]);
			expect(result).toHaveLength(0);
		});

		it('should treat warnings with same code but different node as different', () => {
			const warning1: ValidationWarning = {
				code: 'WARN001',
				message: 'Warning',
				nodeName: 'Node1',
			};

			const warning2: ValidationWarning = {
				code: 'WARN001',
				message: 'Warning',
				nodeName: 'Node2',
			};

			tracker.markAsSeen([warning1]);

			const result = tracker.filterNewWarnings([warning2]);
			expect(result).toEqual([warning2]);
		});

		it('should handle warnings without optional fields', () => {
			const warning1: ValidationWarning = { code: 'WARN001', message: 'Warning 1' };
			const warning2: ValidationWarning = { code: 'WARN001', message: 'Warning 2' };

			// Same code, no nodeName or parameterPath - should be same key
			tracker.markAsSeen([warning1]);

			const result = tracker.filterNewWarnings([warning2]);
			expect(result).toHaveLength(0);
		});

		it('should return empty array when all warnings are seen', () => {
			const warnings: ValidationWarning[] = [
				{ code: 'WARN001', message: 'Warning 1' },
				{ code: 'WARN002', message: 'Warning 2' },
			];

			tracker.markAsSeen(warnings);

			const result = tracker.filterNewWarnings(warnings);
			expect(result).toHaveLength(0);
		});
	});

	describe('markAsSeen', () => {
		it('should add warnings to seen set', () => {
			const warning: ValidationWarning = { code: 'WARN001', message: 'Warning' };

			tracker.markAsSeen([warning]);

			const result = tracker.filterNewWarnings([warning]);
			expect(result).toHaveLength(0);
		});

		it('should handle empty array', () => {
			tracker.markAsSeen([]);

			const warning: ValidationWarning = { code: 'WARN001', message: 'Warning' };
			const result = tracker.filterNewWarnings([warning]);
			expect(result).toHaveLength(1);
		});
	});

	describe('markAsPreExisting', () => {
		it('should mark warnings as pre-existing', () => {
			const warning: ValidationWarning = { code: 'WARN001', message: 'Warning', nodeName: 'Node1' };

			tracker.markAsPreExisting([warning]);

			expect(tracker.isPreExisting(warning)).toBe(true);
		});

		it('should mark multiple warnings as pre-existing', () => {
			const warnings: ValidationWarning[] = [
				{ code: 'WARN001', message: 'Warning 1' },
				{ code: 'WARN002', message: 'Warning 2' },
			];

			tracker.markAsPreExisting(warnings);

			expect(tracker.isPreExisting(warnings[0])).toBe(true);
			expect(tracker.isPreExisting(warnings[1])).toBe(true);
		});

		it('should handle empty array', () => {
			tracker.markAsPreExisting([]);

			const warning: ValidationWarning = { code: 'WARN001', message: 'Warning' };
			expect(tracker.isPreExisting(warning)).toBe(false);
		});
	});

	describe('isPreExisting', () => {
		it('should return false for warnings not marked as pre-existing', () => {
			const warning: ValidationWarning = { code: 'WARN001', message: 'Warning' };

			expect(tracker.isPreExisting(warning)).toBe(false);
		});

		it('should match by key (code|nodeName|parameterPath), not message', () => {
			const original: ValidationWarning = {
				code: 'WARN001',
				message: 'Old message',
				nodeName: 'Node1',
				parameterPath: 'path.to.param',
			};

			tracker.markAsPreExisting([original]);

			const sameKey: ValidationWarning = {
				code: 'WARN001',
				message: 'Different message',
				nodeName: 'Node1',
				parameterPath: 'path.to.param',
			};

			expect(tracker.isPreExisting(sameKey)).toBe(true);
		});

		it('should not match warnings with different nodeName', () => {
			const warning1: ValidationWarning = {
				code: 'WARN001',
				message: 'Warning',
				nodeName: 'Node1',
			};

			tracker.markAsPreExisting([warning1]);

			const warning2: ValidationWarning = {
				code: 'WARN001',
				message: 'Warning',
				nodeName: 'Node2',
			};

			expect(tracker.isPreExisting(warning2)).toBe(false);
		});
	});
});
