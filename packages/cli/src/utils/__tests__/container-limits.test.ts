import { getMemoryLimit, parseCfs, parseCpuMax } from '../container-limits';

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
