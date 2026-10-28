import { totalmem } from 'node:os';
import * as v8 from 'node:v8';

import { getContainerLimit, getOldGenerationLimit, readMemoryUsage } from '../memory-usage';

vi.mock('node:os', async (importOriginal) => ({
	...(await importOriginal<typeof import('node:os')>()),
	totalmem: vi.fn(() => 48 * 1024 ** 3),
}));

vi.mock('node:v8', async (importOriginal) => ({
	...(await importOriginal<typeof import('node:v8')>()),
	getHeapStatistics: vi.fn(),
	getHeapSpaceStatistics: vi.fn(),
}));

const MB = 1024 * 1024;

describe('memory usage', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('getContainerLimit', () => {
		it('should return the cgroup limit when it is below the machine memory', () => {
			vi.spyOn(process, 'constrainedMemory').mockReturnValue(512 * 1024 * 1024);
			expect(getContainerLimit()).toBe(512 * 1024 * 1024);
		});

		it.each([
			['0', 0],
			['the largest 64-bit number', 2 ** 64 - 1],
			['more than the machine memory', totalmem() + 1],
		])('should return undefined when the limit is %s', (_, limit) => {
			vi.spyOn(process, 'constrainedMemory').mockReturnValue(limit);
			expect(getContainerLimit()).toBeUndefined();
		});
	});

	describe('getOldGenerationLimit', () => {
		// Heap size limits measured on Node 26
		it.each([
			['no container limit', undefined, 4192, 4096],
			['no container limit and --max-old-space-size=512', undefined, 608, 512],
			['a 512 MiB container', 512, 268, 256],
			['a 1 GiB container', 1024, 536, 512],
			['a 2 GiB container', 2048, 1072, 1024],
			['a 3 GiB container', 3072, 1632, 1536],
			['a 1280 MiB container and --max-old-space-size=1300', 1280, 1348, 1300],
		])('should subtract the young generation with %s', (_, containerMb, heapLimitMb, oldMb) => {
			vi.mocked(v8.getHeapStatistics).mockReturnValue({
				heap_size_limit: heapLimitMb * MB,
			} as v8.HeapInfo);

			const containerLimit = containerMb === undefined ? undefined : containerMb * MB;

			expect(getOldGenerationLimit(containerLimit)).toBe(oldMb * MB);
		});
	});

	describe('readMemoryUsage', () => {
		beforeEach(() => {
			vi.mocked(v8.getHeapSpaceStatistics).mockReturnValue([
				{ space_name: 'new_space', space_used_size: 50 },
				{ space_name: 'new_large_object_space', space_used_size: 50 },
				{ space_name: 'old_space', space_used_size: 250 },
				{ space_name: 'large_object_space', space_used_size: 50 },
			] as v8.HeapSpaceInfo[]);
		});

		it('should use the old generation when there is no container limit', () => {
			expect(readMemoryUsage(undefined, 1_000)).toEqual({
				utilization: 0.3,
				usedBytes: 300,
				limitBytes: 1_000,
			});
		});

		it('should use RSS when its ratio to the container limit is higher', () => {
			vi.spyOn(process.memoryUsage, 'rss').mockReturnValue(800);

			expect(readMemoryUsage(1_000, 1_000)).toEqual({
				utilization: 0.8,
				usedBytes: 800,
				limitBytes: 1_000,
			});
		});

		it('should use the old generation when its ratio is higher', () => {
			vi.spyOn(process.memoryUsage, 'rss').mockReturnValue(1_000);

			expect(readMemoryUsage(10_000, 1_000).usedBytes).toBe(300);
		});
	});
});
