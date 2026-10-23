import { totalmem } from 'node:os';
import * as v8 from 'node:v8';

import { getContainerLimit, readMemoryUsage } from '../memory-usage';

vi.mock('node:v8', async (importOriginal) => ({
	...(await importOriginal<typeof import('node:v8')>()),
	getHeapStatistics: vi.fn(),
}));

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

	describe('readMemoryUsage', () => {
		beforeEach(() => {
			vi.mocked(v8.getHeapStatistics).mockReturnValue({
				used_heap_size: 300,
				heap_size_limit: 1_000,
			} as v8.HeapInfo);
		});

		it('should use the heap when there is no container limit', () => {
			expect(readMemoryUsage(undefined)).toEqual({
				utilization: 0.3,
				usedBytes: 300,
				limitBytes: 1_000,
			});
		});

		it('should use RSS when its ratio to the container limit is higher', () => {
			vi.spyOn(process.memoryUsage, 'rss').mockReturnValue(800);

			expect(readMemoryUsage(1_000)).toEqual({
				utilization: 0.8,
				usedBytes: 800,
				limitBytes: 1_000,
			});
		});

		it('should use the heap when its ratio is higher', () => {
			vi.spyOn(process.memoryUsage, 'rss').mockReturnValue(1_000);

			expect(readMemoryUsage(10_000).usedBytes).toBe(300);
		});
	});
});
