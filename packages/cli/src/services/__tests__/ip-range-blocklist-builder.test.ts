import { buildBlocklist } from '../ip-range-blocklist-builder';

describe('buildBlocklist', () => {
	it('should build a blocklist from valid CIDR ranges', () => {
		const { blocklist, issues } = buildBlocklist(['10.0.0.0/8', '192.168.0.0/16']);

		expect(issues).toEqual([]);
		expect(blocklist.check('10.0.0.1', 'ipv4')).toBe(true);
		expect(blocklist.check('192.168.1.1', 'ipv4')).toBe(true);
		expect(blocklist.check('8.8.8.8', 'ipv4')).toBe(false);
	});

	it('should build a blocklist from single IP addresses', () => {
		const { blocklist, issues } = buildBlocklist(['127.0.0.1', '::1']);

		expect(issues).toEqual([]);
		expect(blocklist.check('127.0.0.1', 'ipv4')).toBe(true);
		expect(blocklist.check('::1', 'ipv6')).toBe(true);
	});

	it('should report issues for invalid entries with structured error and entry', () => {
		const { issues } = buildBlocklist(['not-an-ip', '10.0.0.0/abc', '999.999.999.999/8']);

		expect(issues).toHaveLength(3);
		expect(issues[0]).toEqual({ entry: 'not-an-ip', error: 'Invalid IP address' });
		expect(issues[1]).toEqual({ entry: '10.0.0.0/abc', error: 'Invalid CIDR notation' });
		expect(issues[2]).toEqual({ entry: '999.999.999.999/8', error: 'Invalid CIDR notation' });
	});

	it('should report issues for out-of-range prefixes', () => {
		const { issues } = buildBlocklist(['10.0.0.0/33', 'fc00::/129']);

		expect(issues).toHaveLength(2);
		expect(issues[0]).toEqual({ entry: '10.0.0.0/33', error: 'Invalid CIDR notation' });
		expect(issues[1]).toEqual({ entry: 'fc00::/129', error: 'Invalid CIDR notation' });
	});

	it('should reject malformed CIDR forms', () => {
		const { issues } = buildBlocklist(['10.0.0.0/8abc', '10.0.0.0/8/extra']);

		expect(issues).toHaveLength(2);
		expect(issues[0]).toEqual({ entry: '10.0.0.0/8abc', error: 'Invalid CIDR notation' });
		expect(issues[1]).toEqual({ entry: '10.0.0.0/8/extra', error: 'Invalid CIDR notation' });
	});

	it('should handle mixed valid and invalid entries', () => {
		const { blocklist, issues } = buildBlocklist(['10.0.0.0/8', 'garbage', '::1']);

		expect(issues).toHaveLength(1);
		expect(issues[0]).toEqual({ entry: 'garbage', error: 'Invalid IP address' });
		expect(blocklist.check('10.0.0.1', 'ipv4')).toBe(true);
		expect(blocklist.check('::1', 'ipv6')).toBe(true);
	});

	it('should handle an empty list', () => {
		const { blocklist, issues } = buildBlocklist([]);

		expect(issues).toEqual([]);
		expect(blocklist.check('10.0.0.1', 'ipv4')).toBe(false);
	});
});
