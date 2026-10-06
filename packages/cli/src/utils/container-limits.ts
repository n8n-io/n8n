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

/** CPU quota as a number of CPUs, for example `0.5`, or `null` when n8n has none. */
export function getCpuLimit(): number | null {
	try {
		return parseCpuMax(readFileSync('/sys/fs/cgroup/cpu.max', 'utf8'));
	} catch {}
	try {
		return parseCfs(
			readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_quota_us', 'utf8'),
			readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_period_us', 'utf8'),
		);
	} catch {
		return null;
	}
}
