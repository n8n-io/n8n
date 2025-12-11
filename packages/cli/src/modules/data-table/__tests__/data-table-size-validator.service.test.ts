import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';

import { Telemetry } from '@/telemetry';

import { DataTableSizeValidator } from '../data-table-size-validator.service';

describe('DataTableSizeValidator', () => {
	let validator: DataTableSizeValidator;
	let fetchSizeFn: jest.Mock;
	const globalConfig = mockInstance(GlobalConfig, {
		dataTable: {
			sizeCheckCacheDuration: 1000,
			warningThreshold: 90 * 1024 * 1024,
			maxSize: 100 * 1024 * 1024,
		},
	});
	const telemetry = mockInstance(Telemetry);
	beforeEach(() => {
		validator = new DataTableSizeValidator(globalConfig, telemetry);
		fetchSizeFn = jest.fn();
		jest.clearAllMocks();
	});

	describe('basic functionality', () => {
		it('should fetch size on first call', async () => {
			fetchSizeFn.mockResolvedValue({ totalBytes: 50 * 1024 * 1024, dataTables: {} }); // 50MB

			await validator.validateSize(fetchSizeFn, new Date('2024-01-01T00:00:00Z'));

			expect(fetchSizeFn).toHaveBeenCalledTimes(1);
		});

		it('should pass validation when size is under limit', async () => {
			fetchSizeFn.mockResolvedValue({ totalBytes: 50 * 1024 * 1024, dataTables: {} });

			await expect(
				validator.validateSize(fetchSizeFn, new Date('2024-01-01T00:00:00Z')),
			).resolves.toBeUndefined();
		});

		it('should throw error when size exceeds limit', async () => {
			fetchSizeFn.mockResolvedValue({ totalBytes: 150 * 1024 * 1024, dataTables: {} });

			await expect(
				validator.validateSize(fetchSizeFn, new Date('2024-01-01T00:00:00Z')),
			).rejects.toThrow('Data table size limit exceeded: 150MB used, limit is 100MB');
		});

		it('should throw error when size equals limit', async () => {
			fetchSizeFn.mockResolvedValue({ totalBytes: 100 * 1024 * 1024, dataTables: {} });

			await expect(
				validator.validateSize(fetchSizeFn, new Date('2024-01-01T00:00:00Z')),
			).rejects.toThrow('Data table size limit exceeded: 100MB used, limit is 100MB');
		});
	});

	describe('caching behavior', () => {
		it('should use cached value within cache duration', async () => {
			fetchSizeFn.mockResolvedValue({ totalBytes: 50 * 1024 * 1024, dataTables: {} });
			const time1 = new Date('2024-01-01T00:00:00Z');
			const time2 = new Date('2024-01-01T00:00:00.500Z'); // 500ms later

			await validator.validateSize(fetchSizeFn, time1);
			await validator.validateSize(fetchSizeFn, time2);

			expect(fetchSizeFn).toHaveBeenCalledTimes(1);
		});

		it('should refresh cache after cache duration expires', async () => {
			fetchSizeFn.mockResolvedValue({ totalBytes: 50 * 1024 * 1024, dataTables: {} });
			const time1 = new Date('2024-01-01T00:00:00Z');
			const time2 = new Date('2024-01-01T00:00:01.001Z'); // 1001ms later

			await validator.validateSize(fetchSizeFn, time1);
			await validator.validateSize(fetchSizeFn, time2);

			expect(fetchSizeFn).toHaveBeenCalledTimes(2);
		});

		it('should always validate against cached value even without refresh', async () => {
			// First call: DB at 50MB
			fetchSizeFn.mockResolvedValue({ totalBytes: 50 * 1024 * 1024, dataTables: {} });
			const time1 = new Date('2024-01-01T00:00:00Z');
			await validator.validateSize(fetchSizeFn, time1);

			// Second call within cache duration: should still validate against 50MB
			const time2 = new Date('2024-01-01T00:00:00.500Z');
			await expect(validator.validateSize(fetchSizeFn, time2)).resolves.toBeUndefined();

			// Even though fetchSizeFn wasn't called again
			expect(fetchSizeFn).toHaveBeenCalledTimes(1);
		});

		it('should fail validation once cached value shows full DB', async () => {
			// First call: DB becomes full (100MB)
			fetchSizeFn.mockResolvedValue({ totalBytes: 100 * 1024 * 1024, dataTables: {} });
			const time1 = new Date('2024-01-01T00:00:00Z');

			await expect(validator.validateSize(fetchSizeFn, time1)).rejects.toThrow(
				'Data table size limit exceeded: 100MB used, limit is 100MB',
			);

			// Subsequent calls within cache duration should also fail
			const time2 = new Date('2024-01-01T00:00:00.500Z');
			await expect(validator.validateSize(fetchSizeFn, time2)).rejects.toThrow(
				'Data table size limit exceeded: 100MB used, limit is 100MB',
			);

			// Size was only fetched once
			expect(fetchSizeFn).toHaveBeenCalledTimes(1);
		});
	});

	describe('concurrent calls', () => {
		it('should handle concurrent calls correctly', async () => {
			let resolveCheck: (value: { totalBytes: number; dataTables: Record<string, number> }) => void;
			const checkPromise = new Promise<{ totalBytes: number; dataTables: Record<string, number> }>(
				(resolve) => {
					resolveCheck = resolve;
				},
			);

			fetchSizeFn.mockImplementation(async () => await checkPromise);

			const time = new Date('2024-01-01T00:00:00Z');

			// Start multiple concurrent calls
			const promise1 = validator.validateSize(fetchSizeFn, time);
			const promise2 = validator.validateSize(fetchSizeFn, time);
			const promise3 = validator.validateSize(fetchSizeFn, time);

			// Let promises start
			await new Promise((resolve) => setImmediate(resolve));

			// Resolve the check with a value under the limit
			resolveCheck!({ totalBytes: 50 * 1024 * 1024, dataTables: {} });

			await Promise.all([promise1, promise2, promise3]);

			// Should only fetch once
			expect(fetchSizeFn).toHaveBeenCalledTimes(1);
		});

		it('should share failure state among concurrent calls', async () => {
			let resolveCheck: (value: { totalBytes: number; dataTables: Record<string, number> }) => void;
			const checkPromise = new Promise<{ totalBytes: number; dataTables: Record<string, number> }>(
				(resolve) => {
					resolveCheck = resolve;
				},
			);

			fetchSizeFn.mockImplementation(async () => await checkPromise);

			const time = new Date('2024-01-01T00:00:00Z');

			// Start multiple concurrent calls
			const promise1 = validator.validateSize(fetchSizeFn, time);
			const promise2 = validator.validateSize(fetchSizeFn, time);
			const promise3 = validator.validateSize(fetchSizeFn, time);

			// Resolve with size over limit
			resolveCheck!({ totalBytes: 150 * 1024 * 1024, dataTables: {} });

			// All should fail with the same error
			await expect(promise1).rejects.toThrow(
				'Data table size limit exceeded: 150MB used, limit is 100MB',
			);
			await expect(promise2).rejects.toThrow(
				'Data table size limit exceeded: 150MB used, limit is 100MB',
			);
			await expect(promise3).rejects.toThrow(
				'Data table size limit exceeded: 150MB used, limit is 100MB',
			);

			// Should only fetch once
			expect(fetchSizeFn).toHaveBeenCalledTimes(1);
		});
	});

	describe('reset functionality', () => {
		it('should clear cache when reset is called', async () => {
			fetchSizeFn.mockResolvedValue({ totalBytes: 50 * 1024 * 1024, dataTables: {} });
			const time1 = new Date('2024-01-01T00:00:00Z');

			// First call
			await validator.validateSize(fetchSizeFn, time1);
			expect(fetchSizeFn).toHaveBeenCalledTimes(1);

			// Reset the cache
			validator.reset();

			// Next call should fetch again even within cache duration
			const time2 = new Date('2024-01-01T00:00:00.500Z');
			await validator.validateSize(fetchSizeFn, time2);
			expect(fetchSizeFn).toHaveBeenCalledTimes(2);
		});
	});

	describe('edge case: DB becomes full after initial check', () => {
		it('should correctly handle DB becoming full between cached checks', async () => {
			// This test verifies that the validator maintains consistency within cache windows.
			// Timeline:
			// t=0: DB at 99MB - fetch and cache this value (99 < 100 limit, so passes)
			// t=500ms: In reality, DB grows to 100MB, but we don't know yet (still using cached 99MB)
			//          New request validates against cached 99MB - correctly PASSES
			//          This is expected behavior: we maintain consistency within the cache window
			// t=1001ms: Cache expires, fetch new value (100MB), validation now correctly FAILS
			// t=1500ms: Still within new cache window, uses cached 100MB, continues to FAIL

			// First check: DB at 99MB (under limit)
			fetchSizeFn.mockResolvedValueOnce({ totalBytes: 99 * 1024 * 1024, dataTables: {} });
			const time1 = new Date('2024-01-01T00:00:00Z');
			await expect(validator.validateSize(fetchSizeFn, time1)).resolves.toBeUndefined();

			// Within cache duration: still validates against cached 99MB
			// This PASSES, which is correct - we're being consistent within our cache window
			const time2 = new Date('2024-01-01T00:00:00.500Z');
			await expect(validator.validateSize(fetchSizeFn, time2)).resolves.toBeUndefined();

			// After cache expires: new check fetches current state showing DB is now full
			fetchSizeFn.mockResolvedValueOnce({ totalBytes: 100 * 1024 * 1024, dataTables: {} });
			const time3 = new Date('2024-01-01T00:00:01.001Z');
			await expect(validator.validateSize(fetchSizeFn, time3)).rejects.toThrow(
				'Data table size limit exceeded: 100MB used, limit is 100MB',
			);

			// Subsequent calls use the cached "full" state and continue to fail correctly
			const time4 = new Date('2024-01-01T00:00:01.500Z');
			await expect(validator.validateSize(fetchSizeFn, time4)).rejects.toThrow(
				'Data table size limit exceeded: 100MB used, limit is 100MB',
			);

			expect(fetchSizeFn).toHaveBeenCalledTimes(2);
		});
	});
});
