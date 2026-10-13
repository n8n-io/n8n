import { readFileSync } from 'node:fs';

/**
 * Memory limit in bytes, or `null` when n8n has none.
 * Node reports 2^64 when no limit is set, which is above `MAX_SAFE_INTEGER`.
 * See https://github.com/nodejs/node/issues/59227
 */
export function getMemoryLimit(): number | null {
	const limit = process.constrainedMemory();
	return limit > 0 && limit < Number.MAX_SAFE_INTEGER ? limit : null;
}

/** Parses cgroup v2 `cpu.max`, for example `200000 100000` or `max 100000`. */
export function parseCpuMax(content: string): number | null {
	const [quota, period] = content.trim().split(/\s+/);
	return toCpus(quota, period);
}

/** Parses the cgroup v1 quota and period. A quota of `-1` means no limit. */
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
	/** Raw `cpu.weight` (v2) or `cpu.shares` (v1). Kubernetes derives it from the CPU request. */
	weight: number | null;
};

function readPositiveInt(path: string): number | null {
	try {
		const value = Number(readFileSync(path, 'utf8').trim());
		return Number.isInteger(value) && value > 0 ? value : null;
	} catch {
		return null;
	}
}

export function getCpuLimit(): CpuLimit {
	try {
		const content = readFileSync('/sys/fs/cgroup/cpu.max', 'utf8').trim();
		// A malformed file is unknown, not "no limit".
		if (!/^(max|\d+) \d+$/.test(content)) throw new Error('Malformed cpu.max');
		return {
			limit: parseCpuMax(content),
			source: 'cgroup_v2',
			weight: readPositiveInt('/sys/fs/cgroup/cpu.weight'),
		};
	} catch {}
	try {
		const quota = readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_quota_us', 'utf8').trim();
		const period = readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_period_us', 'utf8').trim();
		if (!/^-?\d+$/.test(quota) || !/^\d+$/.test(period)) throw new Error('Malformed cfs file');
		return {
			limit: parseCfs(quota, period),
			source: 'cgroup_v1',
			weight: readPositiveInt('/sys/fs/cgroup/cpu/cpu.shares'),
		};
	} catch {
		return { limit: null, source: 'unreadable', weight: null };
	}
}
