import { buildIpRangeList } from '../ip-range-builder';

describe('buildIpRangeList', () => {
	it('should build a list from valid CIDR ranges', () => {
		const { list, issues } = buildIpRangeList(['10.0.0.0/8', '192.168.0.0/16']);

		expect(issues).toEqual([]);
		expect(list.check('10.0.0.1', 'ipv4')).toBe(true);
		expect(list.check('192.168.1.1', 'ipv4')).toBe(true);
		expect(list.check('8.8.8.8', 'ipv4')).toBe(false);
	});

	it('should build a list from single-host CIDR ranges', () => {
		const { list, issues } = buildIpRangeList(['127.0.0.1/32', '::1/128']);

		expect(issues).toEqual([]);
		expect(list.check('127.0.0.1', 'ipv4')).toBe(true);
		expect(list.check('::1', 'ipv6')).toBe(true);
	});

	it('should reject single IP entries without CIDR suffix', () => {
		const { issues } = buildIpRangeList(['127.0.0.1', '::1']);

		expect(issues).toEqual([
			{ entry: '127.0.0.1', error: 'Invalid CIDR notation' },
			{ entry: '::1', error: 'Invalid CIDR notation' },
		]);
	});

	it('should report issues for invalid entries with structured error and entry', () => {
		const { issues } = buildIpRangeList(['not-an-ip', '10.0.0.0/abc', '999.999.999.999/8']);

		expect(issues).toHaveLength(3);
		expect(issues[0]).toEqual({ entry: 'not-an-ip', error: 'Invalid CIDR notation' });
		expect(issues[1]).toEqual({ entry: '10.0.0.0/abc', error: 'Invalid CIDR notation' });
		expect(issues[2]).toEqual({ entry: '999.999.999.999/8', error: 'Invalid CIDR notation' });
	});

	it('should report issues for out-of-range prefixes', () => {
		const { issues } = buildIpRangeList(['10.0.0.0/33', 'fc00::/129']);

		expect(issues).toHaveLength(2);
		expect(issues[0]).toEqual({ entry: '10.0.0.0/33', error: 'Invalid CIDR notation' });
		expect(issues[1]).toEqual({ entry: 'fc00::/129', error: 'Invalid CIDR notation' });
	});

	it('should reject malformed CIDR forms', () => {
		const { issues } = buildIpRangeList(['10.0.0.0/8abc', '10.0.0.0/8/extra']);

		expect(issues).toHaveLength(2);
		expect(issues[0]).toEqual({ entry: '10.0.0.0/8abc', error: 'Invalid CIDR notation' });
		expect(issues[1]).toEqual({ entry: '10.0.0.0/8/extra', error: 'Invalid CIDR notation' });
	});

	it('should handle mixed valid and invalid entries', () => {
		const { list, issues } = buildIpRangeList(['10.0.0.0/8', 'garbage', '::1/128']);

		expect(issues).toHaveLength(1);
		expect(issues[0]).toEqual({ entry: 'garbage', error: 'Invalid CIDR notation' });
		expect(list.check('10.0.0.1', 'ipv4')).toBe(true);
		expect(list.check('::1', 'ipv6')).toBe(true);
	});

	it('should trim entries and ignore empty ones', () => {
		const { list, issues } = buildIpRangeList([' 10.0.0.0/8 ', ' ::1/128 ', '   ']);

		expect(issues).toEqual([]);
		expect(list.check('10.0.0.1', 'ipv4')).toBe(true);
		expect(list.check('::1', 'ipv6')).toBe(true);
	});

	it('should handle an empty list', () => {
		const { list, issues } = buildIpRangeList([]);

		expect(issues).toEqual([]);
		expect(list.check('10.0.0.1', 'ipv4')).toBe(false);
	});
});
