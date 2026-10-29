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

const GB = 1024 * MB;

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
 * The last value of a flag. Node reads `NODE_OPTIONS` first, so the command line wins.
 * A value of 0 resets the flag to the default.
 */
function readFlag(name: string): number | undefined {
	const spellings = [`--${name}`, `--${name.replaceAll('-', '_')}`];
	const args = [...(process.env.NODE_OPTIONS?.split(/\s+/) ?? []), ...process.execArgv];
	let value: number | undefined;
	for (const [i, arg] of args.entries()) {
		const [flag, inlineValue] = arg.split('=');
		if (!spellings.includes(flag)) continue;
		const parsed = Number(inlineValue ?? args[i + 1]);
		if (parsed >= 0) value = parsed > 0 ? parsed : undefined;
	}
	return value;
}

/**
 * V8 aborts when the old generation is full, but `heap_size_limit` also includes the young
 * generation, and V8 has no API for the old generation limit. So the limit comes from the
 * flags, else from the default that Node sets from the container limit or the machine memory:
 * half of it, from 256 MB to 2 GB, or to 4 GB with 15 GB or more.
 */
export function getOldGenerationLimit(containerLimit: number | undefined): number {
	const memory = containerLimit ?? totalmem();
	const percentage = readFlag('max-old-space-size-percentage');
	const sizeMb = readFlag('max-old-space-size');

	let limit: number;
	if (percentage !== undefined) limit = Math.floor(((memory / MB) * percentage) / 100) * MB;
	else if (sizeMb !== undefined) limit = sizeMb * MB;
	else limit = Math.min(Math.max(memory / 2, 256 * MB), memory >= 15 * GB ? 4 * GB : 2 * GB);

	// Pointer compression caps the heap at 4 GB
	return Math.min(limit, getHeapStatistics().heap_size_limit);
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
