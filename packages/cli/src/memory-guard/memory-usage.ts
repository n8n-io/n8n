import { totalmem } from 'node:os';
import { getHeapSpaceStatistics, getHeapStatistics } from 'node:v8';

export interface MemoryUsage {
	/** The higher of the two ratios: RSS to the container limit, and old generation to its limit. */
	utilization: number;
	/** Bytes in use for the ratio that sets the utilization. */
	usedBytes: number;
	/** Limit in bytes for the ratio that sets the utilization. */
	limitBytes: number;
}

const MB = 1024 * 1024;

const YOUNG_GENERATION_SPACES = new Set(['new_space', 'new_large_object_space']);

/**
 * The memory limit of the container, or `undefined` if there is none. Node reports a
 * missing cgroup limit as 0 on some systems and as the largest 64-bit number on others.
 */
export function getContainerLimit(): number | undefined {
	const limit = process.constrainedMemory();
	return limit > 0 && limit <= totalmem() ? limit : undefined;
}

/**
 * V8 aborts when the old generation is full, but `heap_size_limit` also includes the young
 * generation, and V8 has no API for the old generation limit. Node sizes the young generation
 * from the container limit, else from the machine memory: two semi-spaces and a new large
 * object space, each 1/128 of that memory, 2 to 32 MB, rounded up to a power of two.
 * `--max-old-space-size` does not change it, but `--max-semi-space-size` does.
 */
export function getOldGenerationLimit(containerLimit: number | undefined): number {
	const physicalMemory = containerLimit ?? totalmem();
	const semiSpace = Math.min(Math.max(physicalMemory / 128, 2 * MB), 32 * MB);
	const youngGeneration = 3 * 2 ** Math.ceil(Math.log2(semiSpace));
	return getHeapStatistics().heap_size_limit - youngGeneration;
}

/**
 * The kernel kills the container at its cgroup limit, and RSS is close to what the cgroup
 * counts. V8 aborts at the old generation limit, so the old generation counts as well.
 */
export function readMemoryUsage(
	containerLimit: number | undefined,
	oldGenerationLimit: number,
): MemoryUsage {
	let oldGenerationUsed = 0;
	for (const space of getHeapSpaceStatistics()) {
		if (!YOUNG_GENERATION_SPACES.has(space.space_name)) oldGenerationUsed += space.space_used_size;
	}
	const heapUsage: MemoryUsage = {
		utilization: oldGenerationUsed / oldGenerationLimit,
		usedBytes: oldGenerationUsed,
		limitBytes: oldGenerationLimit,
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
