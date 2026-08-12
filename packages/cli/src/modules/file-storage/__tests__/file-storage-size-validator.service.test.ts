import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { Mock } from 'vitest';

import { Telemetry } from '@/telemetry';

import { FileStorageSizeValidator } from '../file-storage-size-validator.service';

describe('FileStorageSizeValidator', () => {
	let validator: FileStorageSizeValidator;
	let fetchSizeFn: Mock;
	const globalConfig = mockInstance(GlobalConfig, {
		fileStorage: {
			sizeCheckCacheDuration: 1000,
			warningThreshold: 90 * 1024 * 1024,
			maxSize: 100 * 1024 * 1024,
		},
	});
	const telemetry = mockInstance(Telemetry);
	beforeEach(() => {
		validator = new FileStorageSizeValidator(globalConfig, telemetry);
		fetchSizeFn = vi.fn();
		vi.clearAllMocks();
	});

	describe('validateSize', () => {
		it('should pass validation when size is under limit', async () => {
			fetchSizeFn.mockResolvedValue({ totalBytes: 50 * 1024 * 1024 });

			await expect(
				validator.validateSize(fetchSizeFn, 'ui-upload', new Date('2026-01-01T00:00:00Z')),
			).resolves.toBeUndefined();
		});

		it('should throw and emit telemetry when size reaches the limit', async () => {
			fetchSizeFn.mockResolvedValue({ totalBytes: 150 * 1024 * 1024 });

			await expect(
				validator.validateSize(fetchSizeFn, 'node-write', new Date('2026-01-01T00:00:00Z')),
			).rejects.toThrow('File storage limit exceeded: 150MB used, limit is 100MB');

			expect(telemetry.track).toHaveBeenCalledWith(
				expect.objectContaining({ name: 'User hit file storage limit' }),
				{
					total_bytes: 150 * 1024 * 1024,
					max_bytes: 100 * 1024 * 1024,
					surface: 'node-write',
				},
			);
		});
	});

	describe('caching behavior', () => {
		it('should use cached value within cache duration', async () => {
			fetchSizeFn.mockResolvedValue({ totalBytes: 50 * 1024 * 1024 });

			await validator.validateSize(fetchSizeFn, 'ui-upload', new Date('2026-01-01T00:00:00Z'));
			await validator.validateSize(fetchSizeFn, 'ui-upload', new Date('2026-01-01T00:00:00.500Z'));

			expect(fetchSizeFn).toHaveBeenCalledTimes(1);
		});

		it('should refresh cache after cache duration expires', async () => {
			fetchSizeFn.mockResolvedValue({ totalBytes: 50 * 1024 * 1024 });

			await validator.validateSize(fetchSizeFn, 'ui-upload', new Date('2026-01-01T00:00:00Z'));
			await validator.validateSize(fetchSizeFn, 'ui-upload', new Date('2026-01-01T00:00:01.001Z'));

			expect(fetchSizeFn).toHaveBeenCalledTimes(2);
		});

		it('should share a single in-flight fetch among concurrent calls', async () => {
			let resolveCheck: (value: { totalBytes: number }) => void;
			const checkPromise = new Promise<{ totalBytes: number }>((resolve) => {
				resolveCheck = resolve;
			});
			fetchSizeFn.mockImplementation(async () => await checkPromise);
			const time = new Date('2026-01-01T00:00:00Z');

			const promises = [
				validator.validateSize(fetchSizeFn, 'ui-upload', time),
				validator.validateSize(fetchSizeFn, 'ui-upload', time),
				validator.validateSize(fetchSizeFn, 'ui-upload', time),
			];
			await new Promise((resolve) => setImmediate(resolve));
			resolveCheck!({ totalBytes: 50 * 1024 * 1024 });
			await Promise.all(promises);

			expect(fetchSizeFn).toHaveBeenCalledTimes(1);
		});

		it('should clear cache when reset is called', async () => {
			fetchSizeFn.mockResolvedValue({ totalBytes: 50 * 1024 * 1024 });

			await validator.validateSize(fetchSizeFn, 'ui-upload', new Date('2026-01-01T00:00:00Z'));
			validator.reset();
			await validator.validateSize(fetchSizeFn, 'ui-upload', new Date('2026-01-01T00:00:00.500Z'));

			expect(fetchSizeFn).toHaveBeenCalledTimes(2);
		});
	});

	describe('sizeToState', () => {
		it('should map sizes to ok/warn/error against the thresholds', () => {
			expect(validator.sizeToState(10 * 1024 * 1024)).toBe('ok');
			expect(validator.sizeToState(90 * 1024 * 1024)).toBe('warn');
			expect(validator.sizeToState(100 * 1024 * 1024)).toBe('error');
		});

		it('should default the warning threshold to 80% of max', () => {
			globalConfig.fileStorage.warningThreshold = undefined;

			expect(validator.sizeToState(79 * 1024 * 1024)).toBe('ok');
			expect(validator.sizeToState(80 * 1024 * 1024)).toBe('warn');

			globalConfig.fileStorage.warningThreshold = 90 * 1024 * 1024;
		});
	});
});
