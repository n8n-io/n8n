import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';

import { ChatMemorySizeValidator } from '../chat-memory-size-validator.service';

describe('ChatMemorySizeValidator', () => {
	let validator: ChatMemorySizeValidator;
	let fetchSizeFn: jest.Mock;
	const globalConfig = mockInstance(GlobalConfig, {
		chatHub: {
			chatMemorySizeCheckCacheDuration: 1000,
			chatMemoryWarningThreshold: 90 * 1024 * 1024,
			chatMemoryMaxSize: 100 * 1024 * 1024,
		},
	});

	beforeEach(() => {
		jest.useFakeTimers();
		validator = new ChatMemorySizeValidator(globalConfig);
		fetchSizeFn = jest.fn();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe('basic functionality', () => {
		it('should fetch size on first call', async () => {
			fetchSizeFn.mockResolvedValue({ totalBytes: 50 * 1024 * 1024 });

			await validator.validateSize(fetchSizeFn);

			expect(fetchSizeFn).toHaveBeenCalledTimes(1);
		});

		it('should pass validation when size is under limit', async () => {
			fetchSizeFn.mockResolvedValue({ totalBytes: 50 * 1024 * 1024 });

			await expect(validator.validateSize(fetchSizeFn)).resolves.toBeUndefined();
		});

		it('should throw error when size exceeds limit', async () => {
			fetchSizeFn.mockResolvedValue({ totalBytes: 150 * 1024 * 1024 });

			await expect(validator.validateSize(fetchSizeFn)).rejects.toThrow(
				'Chat memory size limit exceeded: 150MB used, limit is 100MB',
			);
		});

		it('should throw error when size equals limit', async () => {
			fetchSizeFn.mockResolvedValue({ totalBytes: 100 * 1024 * 1024 });

			await expect(validator.validateSize(fetchSizeFn)).rejects.toThrow(
				'Chat memory size limit exceeded: 100MB used, limit is 100MB',
			);
		});
	});

	describe('caching behavior', () => {
		it('should use cached value within cache duration', async () => {
			fetchSizeFn.mockResolvedValue({ totalBytes: 50 * 1024 * 1024 });

			await validator.validateSize(fetchSizeFn);
			jest.advanceTimersByTime(500);
			await validator.validateSize(fetchSizeFn);

			expect(fetchSizeFn).toHaveBeenCalledTimes(1);
		});

		it('should refresh cache after cache duration expires', async () => {
			fetchSizeFn.mockResolvedValue({ totalBytes: 50 * 1024 * 1024 });

			await validator.validateSize(fetchSizeFn);
			jest.advanceTimersByTime(1001);
			await validator.validateSize(fetchSizeFn);

			expect(fetchSizeFn).toHaveBeenCalledTimes(2);
		});
	});

	describe('concurrent calls', () => {
		it('should handle concurrent calls correctly', async () => {
			// Use real timers for this test — we're testing promise dedup, not time-based caching
			jest.useRealTimers();

			let resolveCheck: (value: { totalBytes: number }) => void;
			const checkPromise = new Promise<{ totalBytes: number }>((resolve) => {
				resolveCheck = resolve;
			});

			fetchSizeFn.mockImplementation(async () => await checkPromise);

			const promise1 = validator.validateSize(fetchSizeFn);
			const promise2 = validator.validateSize(fetchSizeFn);
			const promise3 = validator.validateSize(fetchSizeFn);

			await new Promise((resolve) => setImmediate(resolve));

			resolveCheck!({ totalBytes: 50 * 1024 * 1024 });

			await Promise.all([promise1, promise2, promise3]);

			expect(fetchSizeFn).toHaveBeenCalledTimes(1);
		});
	});

	describe('sizeToState', () => {
		it('should return ok when under warning threshold', () => {
			expect(validator.sizeToState(50 * 1024 * 1024)).toBe('ok');
		});

		it('should return warn when at warning threshold', () => {
			expect(validator.sizeToState(90 * 1024 * 1024)).toBe('warn');
		});

		it('should return error when at max size', () => {
			expect(validator.sizeToState(100 * 1024 * 1024)).toBe('error');
		});

		it('should return error when above max size', () => {
			expect(validator.sizeToState(150 * 1024 * 1024)).toBe('error');
		});
	});

	describe('reset functionality', () => {
		it('should clear cache when reset is called', async () => {
			fetchSizeFn.mockResolvedValue({ totalBytes: 50 * 1024 * 1024 });

			await validator.validateSize(fetchSizeFn);
			expect(fetchSizeFn).toHaveBeenCalledTimes(1);

			validator.reset();

			await validator.validateSize(fetchSizeFn);
			expect(fetchSizeFn).toHaveBeenCalledTimes(2);
		});
	});
});
