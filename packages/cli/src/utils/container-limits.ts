import { readFileSync } from 'node:fs';

/**
 * Memory limit in bytes, or `null` when n8n has none.
 * Node reports 2^64 when no limit is set, which is above `MAX_SAFE_INTEGER`.
 * See https://nodejs.org/api/process.html (`process.constrainedMemory()`)
 * and https://github.com/nodejs/node/issues/59227
 */
export function getMemoryLimit(): number | null {
	const limit = process.constrainedMemory();
	return limit > 0 && limit < Number.MAX_SAFE_INTEGER ? limit : null;
}

/**
 * Parses cgroup v2 `cpu.max`, for example `200000 100000` or `max 100000`.
 * See https://docs.kernel.org/admin-guide/cgroup-v2.html#cpu-interface-files
 */
export function parseCpuMax(content: string): number | null {
	const [quota, period] = content.trim().split(/\s+/);
	return toCpus(quota, period);
}

/**
 * Parses the cgroup v1 quota and period. A quota of `-1` means no limit.
 * See https://docs.kernel.org/scheduler/sched-bwc.html#cfs-bandwidth-control
 */
export function parseCfs(quota: string, period: string): number | null {
	return toCpus(quota.trim(), period.trim());
}

function toCpus(quota: string | undefined, period: string | undefined): number | null {
	const q = Number(quota);
	const p = Number(period);
	if (!quota || quota === 'max' || !Number.isFinite(q) || q <= 0 || !Number.isFinite(p) || p <= 0) {
		return null;
	}
	return q / p;
}

export type CpuLimit = {
	/** CPUs, for example `0.5`, or `null` when the file reports no quota. */
	limit: number | null;
	/** Which cgroup version answered. `unreadable` means no usable file, so the limit is unknown. */
	source: 'cgroup_v2' | 'cgroup_v1' | 'unreadable';
	/**
	 * Raw `cpu.weight` (v2) or `cpu.shares` (v1). Kubernetes derives it from the CPU request.
	 * See https://docs.kernel.org/admin-guide/cgroup-v2.html#cpu-interface-files,
	 * https://docs.kernel.org/scheduler/sched-design-CFS.html#group-scheduler-extensions-to-cfs
	 * and https://github.com/kubernetes/enhancements/blob/master/keps/sig-node/2254-cgroup-v2/README.md
	 */
	weight: number | null;
};

/** CPU quota n8n was given. Tries cgroup v2 first, then cgroup v1. */
export function getCpuLimit(): CpuLimit {
	const cpuMax = readFile('/sys/fs/cgroup/cpu.max');
	// A malformed file is unknown, not "no limit".
	if (cpuMax !== null && /^(max|\d+) \d+$/.test(cpuMax)) {
		return {
			limit: parseCpuMax(cpuMax),
			source: 'cgroup_v2',
			weight: readPositiveInt('/sys/fs/cgroup/cpu.weight'),
		};
	}

	const quota = readFile('/sys/fs/cgroup/cpu/cpu.cfs_quota_us');
	const period = readFile('/sys/fs/cgroup/cpu/cpu.cfs_period_us');
	if (quota !== null && period !== null && /^-?\d+$/.test(quota) && /^\d+$/.test(period)) {
		return {
			limit: parseCfs(quota, period),
			source: 'cgroup_v1',
			weight: readPositiveInt('/sys/fs/cgroup/cpu/cpu.shares'),
		};
	}

	return { limit: null, source: 'unreadable', weight: null };
}

function readFile(path: string): string | null {
	try {
		return readFileSync(path, 'utf8').trim();
	} catch {
		return null;
	}
}

function readPositiveInt(path: string): number | null {
	const value = Number(readFile(path));
	return Number.isInteger(value) && value > 0 ? value : null;
}
