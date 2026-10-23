import { readFileSync } from 'node:fs';

import { getCpuLimit, getMemoryLimit, parseCfs, parseCpuMax } from '../container-limits';

vi.mock('node:fs', () => ({ readFileSync: vi.fn() }));

describe('parseCpuMax', () => {
	it.each([
		['200000 100000', 2],
		['50000 100000', 0.5],
		['150000 100000\n', 1.5],
		['max 100000', null],
		['max 100000\n', null],
		['', null],
		['garbage', null],
		['0 100000', null],
		['100000 0', null],
	])('parses %j as %s', (content, expected) => {
		expect(parseCpuMax(content)).toBe(expected);
	});
});

describe('parseCfs', () => {
	it.each([
		['100000\n', '100000\n', 1],
		['25000', '100000', 0.25],
		['-1\n', '100000\n', null],
		['', '100000', null],
		['100000', '', null],
	])('parses quota %j and period %j as %s', (quota, period, expected) => {
		expect(parseCfs(quota, period)).toBe(expected);
	});
});

describe('getMemoryLimit', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it.each([
		['a limit', 1024 ** 3, 1024 ** 3],
		['no limit, which Node reports as 2^64', 18446744073709552000, null],
		['zero', 0, null],
	])('returns the right value for %s', (_, constrained, expected) => {
		vi.spyOn(process, 'constrainedMemory').mockReturnValue(constrained);
		expect(getMemoryLimit()).toBe(expected);
	});
});

describe('getCpuLimit', () => {
	const mockFiles = (files: Record<string, string>) =>
		vi.mocked(readFileSync).mockImplementation((path) => {
			const content = files[String(path)];
			if (content === undefined) throw new Error('ENOENT');
			return content;
		});

	it('reads the cgroup v2 quota', () => {
		mockFiles({ '/sys/fs/cgroup/cpu.max': '50000 100000\n' });
		expect(getCpuLimit()).toEqual({ limit: 0.5, source: 'cgroup_v2', weight: null });
	});

	it('reports a cgroup v2 file without a quota as null, not unreadable', () => {
		mockFiles({
			'/sys/fs/cgroup/cpu.max': 'max 100000\n',
			'/sys/fs/cgroup/cpu/cpu.cfs_quota_us': '50000\n',
			'/sys/fs/cgroup/cpu/cpu.cfs_period_us': '100000\n',
		});
		expect(getCpuLimit()).toEqual({ limit: null, source: 'cgroup_v2', weight: null });
	});

	it('falls back to the cgroup v1 quota and period', () => {
		mockFiles({
			'/sys/fs/cgroup/cpu/cpu.cfs_quota_us': '200000\n',
			'/sys/fs/cgroup/cpu/cpu.cfs_period_us': '100000\n',
		});
		expect(getCpuLimit()).toEqual({ limit: 2, source: 'cgroup_v1', weight: null });
	});

	it('reports unreadable when no cgroup files exist', () => {
		mockFiles({});
		expect(getCpuLimit()).toEqual({ limit: null, source: 'unreadable', weight: null });
	});

	it.each([[''], ['garbage'], ['50000']])('treats cgroup v2 file %j as unreadable', (content) => {
		mockFiles({ '/sys/fs/cgroup/cpu.max': content });
		expect(getCpuLimit()).toEqual({ limit: null, source: 'unreadable', weight: null });
	});

	it('reads the cgroup v2 weight', () => {
		mockFiles({ '/sys/fs/cgroup/cpu.max': 'max 100000\n', '/sys/fs/cgroup/cpu.weight': '39\n' });
		expect(getCpuLimit()).toEqual({ limit: null, source: 'cgroup_v2', weight: 39 });
	});

	it('reads the cgroup v1 shares', () => {
		mockFiles({
			'/sys/fs/cgroup/cpu/cpu.cfs_quota_us': '-1\n',
			'/sys/fs/cgroup/cpu/cpu.cfs_period_us': '100000\n',
			'/sys/fs/cgroup/cpu/cpu.shares': '1024\n',
		});
		expect(getCpuLimit()).toEqual({ limit: null, source: 'cgroup_v1', weight: 1024 });
	});
});
