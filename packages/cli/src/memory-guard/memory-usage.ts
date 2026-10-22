import { totalmem } from 'node:os';
import { getHeapStatistics } from 'node:v8';

export interface MemoryUsage {
	/** The higher of the two ratios: RSS to the container limit, and heap to the heap limit. */
	utilization: number;
	/** Bytes in use for the ratio that sets the utilization. */
	usedBytes: number;
	/** Limit in bytes for the ratio that sets the utilization. */
	limitBytes: number;
}

/**
 * The memory limit of the container, or `undefined` if there is none. Node reports a
 * missing cgroup limit as 0 on some systems and as the largest 64-bit number on others.
 */
export function getContainerLimit(): number | undefined {
	const limit = process.constrainedMemory();
	return limit > 0 && limit <= totalmem() ? limit : undefined;
}

/**
 * The kernel kills the container at its cgroup limit, and RSS is close to what the cgroup
 * counts. V8 aborts at the heap limit, so the heap counts as well.
 */
export function readMemoryUsage(containerLimit: number | undefined): MemoryUsage {
	const heap = getHeapStatistics();
	const heapUsage: MemoryUsage = {
		utilization: heap.used_heap_size / heap.heap_size_limit,
		usedBytes: heap.used_heap_size,
		limitBytes: heap.heap_size_limit,
	};
	if (containerLimit === undefined) return heapUsage;

	const rss = process.memoryUsage.rss();
	const containerUsage: MemoryUsage = {
		utilization: rss / containerLimit,
		usedBytes: rss,
		limitBytes: containerLimit,
	};
	return containerUsage.utilization >= heapUsage.utilization ? containerUsage : heapUsage;
}
