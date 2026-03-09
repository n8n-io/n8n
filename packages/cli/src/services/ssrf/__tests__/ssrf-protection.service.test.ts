import type { Logger } from '@n8n/backend-common';
import { SsrfProtectionConfig } from '@n8n/config';
import { mock } from 'jest-mock-extended';

import type { DnsResolver } from '../dns-resolver';
import { SsrfProtectionService } from '../ssrf-protection.service';

function createConfig(overrides: Partial<SsrfProtectionConfig> = {}): SsrfProtectionConfig {
	const config = new SsrfProtectionConfig();
	Object.assign(config, overrides);
	return config;
}

const mockScopedLogger = mock<Logger>();
const mockLogger = mock<Logger>({ scoped: jest.fn().mockReturnValue(mockScopedLogger) });

function createMockDnsResolver() {
	const resolver = mock<DnsResolver>();
	resolver.lookup.mockResolvedValue([]);
	return resolver;
}

function createService(
	configOverrides: Partial<SsrfProtectionConfig> = {},
	dnsResolver?: ReturnType<typeof createMockDnsResolver>,
) {
	const config = createConfig(configOverrides);
	const resolver = dnsResolver ?? createMockDnsResolver();
	return {
		service: new SsrfProtectionService(config, resolver, mockLogger),
		dnsResolver: resolver,
	};
}

describe('SsrfProtectionService', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('validateIp', () => {
		describe('blocked private ranges (RFC 1918)', () => {
			it.each([
				['10.0.0.1', '10.0.0.0/8'],
				['10.255.255.255', '10.0.0.0/8'],
				['172.16.0.1', '172.16.0.0/12'],
				['172.31.255.255', '172.16.0.0/12'],
				['192.168.0.1', '192.168.0.0/16'],
				['192.168.255.255', '192.168.0.0/16'],
			])('should block %s (in %s)', (ip) => {
				const { service } = createService();
				const result = service.validateIp(ip);
				expect(result).toEqual({ allowed: false, reason: 'IP address is blocked', ip });
			});
		});

		describe('blocked loopback addresses', () => {
			it.each(['127.0.0.1', '127.0.0.2', '127.255.255.255'])(
				'should block IPv4 loopback %s',
				(ip) => {
					const { service } = createService();
					expect(service.validateIp(ip)).toEqual({
						allowed: false,
						reason: 'IP address is blocked',
						ip,
					});
				},
			);

			it('should block IPv6 loopback ::1', () => {
				const { service } = createService();
				expect(service.validateIp('::1')).toEqual({
					allowed: false,
					reason: 'IP address is blocked',
					ip: '::1',
				});
			});
		});

		describe('blocked link-local addresses', () => {
			it('should block IPv4 link-local 169.254.1.1', () => {
				const { service } = createService();
				expect(service.validateIp('169.254.1.1')).toEqual({
					allowed: false,
					reason: 'IP address is blocked',
					ip: '169.254.1.1',
				});
			});

			it('should block IPv6 link-local fe80::1', () => {
				const { service } = createService();
				expect(service.validateIp('fe80::1')).toEqual({
					allowed: false,
					reason: 'IP address is blocked',
					ip: 'fe80::1',
				});
			});
		});

		describe('blocked metadata/special addresses', () => {
			it.each(['0.0.0.0', '192.0.0.1', '192.0.2.1', '198.18.0.1', '198.51.100.1', '203.0.113.1'])(
				'should block special address %s',
				(ip) => {
					const { service } = createService();
					expect(service.validateIp(ip)).toEqual({
						allowed: false,
						reason: 'IP address is blocked',
						ip,
					});
				},
			);
		});

		describe('allowed public addresses', () => {
			it.each(['8.8.8.8', '1.1.1.1', '93.184.216.34', '2606:4700::6810:85e5'])(
				'should allow public IP %s',
				(ip) => {
					const { service } = createService();
					expect(service.validateIp(ip)).toEqual({ allowed: true });
				},
			);
		});

		describe('allowlist overrides blocklist', () => {
			it('should allow a blocked IP if it is in the allowlist', () => {
				const { service } = createService({
					allowedIpRanges: ['10.0.0.0/8'] as unknown as SsrfProtectionConfig['allowedIpRanges'],
				});

				expect(service.validateIp('10.0.0.1')).toEqual({ allowed: true });
			});

			it('should allow a specific blocked IP in the allowlist', () => {
				const { service } = createService({
					allowedIpRanges: ['127.0.0.1/32'] as unknown as SsrfProtectionConfig['allowedIpRanges'],
				});

				expect(service.validateIp('127.0.0.1')).toEqual({ allowed: true });
				// Other loopback IPs should still be blocked
				expect(service.validateIp('127.0.0.2')).toEqual({
					allowed: false,
					reason: 'IP address is blocked',
					ip: '127.0.0.2',
				});
			});
		});

		it('should return invalid for non-IP strings', () => {
			const { service } = createService();
			expect(service.validateIp('not-an-ip')).toEqual({
				allowed: false,
				reason: 'Invalid IP address',
				ip: 'not-an-ip',
			});
		});
	});

	describe('validateUrl', () => {
		it('should reject invalid URLs', async () => {
			const { service } = createService();
			const result = await service.validateUrl('not-a-url');
			expect(result).toEqual({ allowed: false, reason: 'Invalid URL', url: 'not-a-url' });
		});

		it('should validate direct IPv4 addresses in URLs', async () => {
			const { service } = createService();

			const result = await service.validateUrl('http://127.0.0.1/admin');

			expect(result).toEqual({
				allowed: false,
				reason: 'IP address is blocked',
				ip: '127.0.0.1',
			});
		});

		it('should validate direct IPv6 addresses in URLs', async () => {
			const { service } = createService();

			const result = await service.validateUrl('http://[::1]/admin');

			expect(result).toEqual({
				allowed: false,
				reason: 'IP address is blocked',
				ip: '::1',
			});
		});

		it('should allow public IPs in URLs', async () => {
			const { service } = createService();

			const result = await service.validateUrl('http://8.8.8.8/');

			expect(result).toEqual({ allowed: true });
		});

		it('should resolve hostnames and validate resolved IPs', async () => {
			const dnsResolver = createMockDnsResolver();
			dnsResolver.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);

			const { service } = createService({}, dnsResolver);
			const result = await service.validateUrl('http://example.com/api');

			expect(result).toEqual({ allowed: true });
		});

		it('should block if hostname resolves to blocked IP', async () => {
			const dnsResolver = createMockDnsResolver();
			dnsResolver.lookup.mockResolvedValue([{ address: '10.0.0.1', family: 4 }]);

			const { service } = createService({}, dnsResolver);
			const result = await service.validateUrl('http://malicious.com/');

			expect(result).toEqual({
				allowed: false,
				reason: 'IP address is blocked',
				ip: '10.0.0.1',
			});
		});

		it('should block if any resolved IP is blocked', async () => {
			const dnsResolver = createMockDnsResolver();
			dnsResolver.lookup.mockResolvedValue([
				{ address: '93.184.216.34', family: 4 },
				{ address: '127.0.0.1', family: 4 },
			]);

			const { service } = createService({}, dnsResolver);
			const result = await service.validateUrl('http://multi-ip.example.com/');

			expect(result).toEqual({
				allowed: false,
				reason: 'IP address is blocked',
				ip: '127.0.0.1',
			});
		});

		it('should block if any resolved IP is blocked across IPv4/IPv6', async () => {
			const dnsResolver = createMockDnsResolver();
			dnsResolver.lookup.mockResolvedValue([
				{ address: '93.184.216.34', family: 4 },
				{ address: '::1', family: 6 },
			]);

			const { service } = createService({}, dnsResolver);
			const result = await service.validateUrl('http://mixed-family.example.com/');

			expect(result).toEqual({
				allowed: false,
				reason: 'IP address is blocked',
				ip: '::1',
			});
		});

		it('should fail when DNS resolution returns no results', async () => {
			const dnsResolver = createMockDnsResolver();
			dnsResolver.lookup.mockResolvedValue([]);

			const { service } = createService({}, dnsResolver);
			const result = await service.validateUrl('http://nonexistent.example.com/');

			expect(result).toEqual({
				allowed: false,
				reason: 'DNS resolution failed',
				hostname: 'nonexistent.example.com',
			});
		});

		it('should bubble up DNS resolver errors', async () => {
			const dnsResolver = createMockDnsResolver();
			dnsResolver.lookup.mockRejectedValue(new Error('ENOTFOUND'));

			const { service } = createService({}, dnsResolver);

			await expect(service.validateUrl('http://nonexistent.example.com/')).rejects.toThrow(
				'ENOTFOUND',
			);
		});

		it('should bypass IP checks when hostname is in allowlist', async () => {
			const dnsResolver = createMockDnsResolver();
			dnsResolver.lookup.mockResolvedValue([{ address: '10.0.0.1', family: 4 }]);

			const { service } = createService(
				{
					allowedHostnames: [
						'*.internal.n8n.io',
					] as unknown as SsrfProtectionConfig['allowedHostnames'],
				},
				dnsResolver,
			);

			const result = await service.validateUrl('http://api.internal.n8n.io/health');

			expect(result).toEqual({ allowed: true });
			// DNS should not have been called since hostname matched
			expect(dnsResolver.lookup).not.toHaveBeenCalled();
		});

		it('should accept URL objects', async () => {
			const { service } = createService();
			const result = await service.validateUrl(new URL('http://127.0.0.1'));
			expect(result).toEqual({
				allowed: false,
				reason: 'IP address is blocked',
				ip: '127.0.0.1',
			});
		});

		it('should use DNS resolver for hostname lookups', async () => {
			const dnsResolver = createMockDnsResolver();
			dnsResolver.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);

			const { service } = createService({}, dnsResolver);
			const result = await service.validateUrl('http://cached.example.com/');

			expect(result).toEqual({ allowed: true });
			expect(dnsResolver.lookup).toHaveBeenCalledWith('cached.example.com', { all: true });
		});
	});

	describe('validateRedirectSync', () => {
		it('should block direct-IP redirect targets', () => {
			const { service } = createService();

			expect(() => service.validateRedirectSync('http://127.0.0.1/admin')).toThrow(
				'IP address is blocked',
			);
		});

		it('should block redirect chains from public to private', async () => {
			const dnsResolver = createMockDnsResolver();
			dnsResolver.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);

			const { service } = createService({}, dnsResolver);

			// Initial URL is public (allowed)
			const initial = await service.validateUrl('http://public.example.com');
			expect(initial).toEqual({ allowed: true });

			// Redirect target is private (blocked)
			expect(() => service.validateRedirectSync('http://192.168.1.1/admin')).toThrow(
				'IP address is blocked',
			);
		});

		it('should ignore invalid redirect URLs', () => {
			const { service } = createService();

			expect(() => service.validateRedirectSync('not-a-url')).not.toThrow();
		});
	});

	describe('createSecureLookup', () => {
		it('should resolve and validate IPs at connection time', (done) => {
			const dnsResolver = createMockDnsResolver();
			dnsResolver.lookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);

			const { service } = createService({}, dnsResolver);
			const lookup = service.createSecureLookup();

			lookup('example.com', { all: false }, (lookupError, address, family) => {
				expect(lookupError).toBeNull();
				expect(address).toBe('93.184.216.34');
				expect(family).toBe(4);
				done();
			});
		});

		it('should reject blocked IPs during lookup', (done) => {
			const dnsResolver = createMockDnsResolver();
			dnsResolver.lookup.mockResolvedValue([{ address: '10.0.0.1', family: 4 }]);

			const { service } = createService({}, dnsResolver);
			const lookup = service.createSecureLookup();

			lookup('evil.com', { all: false }, (lookupError) => {
				expect(lookupError).toBeTruthy();
				expect(lookupError?.message).toContain('IP address is blocked');
				done();
			});
		});

		it('should return all addresses when all=true', (done) => {
			const dnsResolver = createMockDnsResolver();
			dnsResolver.lookup.mockResolvedValue([
				{ address: '93.184.216.34', family: 4 },
				{ address: '93.184.216.35', family: 4 },
			]);

			const { service } = createService({}, dnsResolver);
			const lookup = service.createSecureLookup();

			lookup('multi.example.com', { all: true }, (lookupError, addresses) => {
				expect(lookupError).toBeNull();
				expect(addresses).toEqual([
					{ address: '93.184.216.34', family: 4 },
					{ address: '93.184.216.35', family: 4 },
				]);
				done();
			});
		});

		it('should respect family=6 and return only IPv6 addresses', (done) => {
			const dnsResolver = createMockDnsResolver();
			dnsResolver.lookup.mockResolvedValue([{ address: '2606:4700::6810:85e5', family: 6 }]);

			const { service } = createService({}, dnsResolver);
			const lookup = service.createSecureLookup();

			lookup('dualstack.example.com', { all: false, family: 6 }, (lookupError, address, family) => {
				expect(lookupError).toBeNull();
				expect(address).toBe('2606:4700::6810:85e5');
				expect(family).toBe(6);
				expect(dnsResolver.lookup).toHaveBeenCalledWith('dualstack.example.com', {
					all: false,
					family: 6,
				});
				done();
			});
		});

		it('should fail when requested family has no resolved addresses', (done) => {
			const dnsResolver = createMockDnsResolver();
			dnsResolver.lookup.mockResolvedValue([]);

			const { service } = createService({}, dnsResolver);
			const lookup = service.createSecureLookup();

			lookup('ipv4-only.example.com', { all: false, family: 6 }, (lookupError, address, family) => {
				expect(lookupError).toBeTruthy();
				expect(address).toBe('');
				expect(family).toBeUndefined();
				expect(dnsResolver.lookup).toHaveBeenCalledWith('ipv4-only.example.com', {
					all: false,
					family: 6,
				});
				done();
			});
		});

		it('should allow hostnames in the allowlist without IP validation', (done) => {
			const dnsResolver = createMockDnsResolver();
			dnsResolver.lookup.mockResolvedValue([{ address: '10.0.0.1', family: 4 }]);

			const { service } = createService(
				{
					allowedHostnames: [
						'*.internal.n8n.io',
					] as unknown as SsrfProtectionConfig['allowedHostnames'],
				},
				dnsResolver,
			);
			const lookup = service.createSecureLookup();

			lookup('api.internal.n8n.io', { all: false }, (lookupError, address) => {
				expect(lookupError).toBeNull();
				expect(address).toBe('10.0.0.1');
				done();
			});
		});

		it('should pass empty string and undefined family on non-all lookup errors', (done) => {
			const dnsResolver = createMockDnsResolver();
			dnsResolver.lookup.mockRejectedValue(new Error('ENOTFOUND'));

			const { service } = createService({}, dnsResolver);
			const lookup = service.createSecureLookup();

			lookup('failing.example.com', { all: false }, (lookupError, address, family) => {
				expect(lookupError).toBeTruthy();
				expect(address).toBe('');
				expect(family).toBeUndefined();
				done();
			});
		});

		it('should pass empty array and undefined family on all=true lookup errors', (done) => {
			const dnsResolver = createMockDnsResolver();
			dnsResolver.lookup.mockRejectedValue(new Error('ENOTFOUND'));

			const { service } = createService({}, dnsResolver);
			const lookup = service.createSecureLookup();

			lookup('failing.example.com', { all: true }, (lookupError, address, family) => {
				expect(lookupError).toBeTruthy();
				expect(address).toEqual([]);
				expect(family).toBeUndefined();
				done();
			});
		});
	});

	describe('bypass prevention', () => {
		describe('URL encoding tricks', () => {
			it('should handle percent-encoded hostnames', async () => {
				const { service } = createService();

				// %31%32%37%2e%30%2e%30%2e%31 = 127.0.0.1 percent-encoded
				// URL constructor normalizes this back to 127.0.0.1
				const result = await service.validateUrl('http://%31%32%37%2e%30%2e%30%2e%31/');
				expect(result).toEqual({
					allowed: false,
					reason: 'IP address is blocked',
					ip: '127.0.0.1',
				});
			});

			it('should handle URLs with encoded path components', async () => {
				const { service } = createService();

				const result = await service.validateUrl('http://127.0.0.1/%61%64%6d%69%6e');
				expect(result).toEqual({
					allowed: false,
					reason: 'IP address is blocked',
					ip: '127.0.0.1',
				});
			});
		});

		describe('decimal/octal/hex IP representations', () => {
			it('should block decimal IP representation via DNS resolution', async () => {
				// 2130706433 = 127.0.0.1 in decimal — URL constructor treats it as hostname
				const dnsResolver = createMockDnsResolver();
				dnsResolver.lookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);

				const { service } = createService({}, dnsResolver);
				const result = await service.validateUrl('http://2130706433/');

				expect(result).toEqual({
					allowed: false,
					reason: 'IP address is blocked',
					ip: '127.0.0.1',
				});
			});
		});

		describe('IPv6-mapped IPv4 addresses', () => {
			it('should block ::ffff:127.0.0.1', () => {
				const { service } = createService();

				const result = service.validateIp('::ffff:127.0.0.1');

				expect(result).toEqual({
					allowed: false,
					reason: 'IP address is blocked',
					ip: '::ffff:127.0.0.1',
				});
			});

			it('should block ::ffff:10.0.0.1', () => {
				const { service } = createService();
				expect(service.validateIp('::ffff:10.0.0.1')).toEqual({
					allowed: false,
					reason: 'IP address is blocked',
					ip: '::ffff:10.0.0.1',
				});
			});

			it('should allow ::ffff: with public IP', () => {
				const { service } = createService();
				expect(service.validateIp('::ffff:8.8.8.8')).toEqual({ allowed: true });
			});
		});

		describe('DNS rebinding prevention (TOCTOU)', () => {
			it('should validate IPs at connection time via secure lookup', (done) => {
				const dnsResolver = createMockDnsResolver();
				dnsResolver.lookup.mockResolvedValueOnce([{ address: '10.0.0.1', family: 4 }]);

				const { service } = createService({}, dnsResolver);
				const lookup = service.createSecureLookup();

				lookup('rebinding.evil.com', { all: false }, (lookupError) => {
					expect(lookupError).toBeTruthy();
					expect(lookupError?.message).toContain('IP address is blocked');
					done();
				});
			});
		});

		describe('redirect chains', () => {
			it('should block redirect from public to private IP', () => {
				const { service } = createService();

				expect(() => service.validateRedirectSync('http://10.0.0.1/internal')).toThrow(
					'IP address is blocked',
				);
			});

			it('should block redirect to loopback', () => {
				const { service } = createService();

				expect(() => service.validateRedirectSync('http://[::1]/admin')).toThrow(
					'IP address is blocked',
				);
			});
		});

		describe('IPv6 unique local addresses', () => {
			it('should block fc00:: addresses', () => {
				const { service } = createService();
				expect(service.validateIp('fc00::1')).toEqual({
					allowed: false,
					reason: 'IP address is blocked',
					ip: 'fc00::1',
				});
			});

			it('should block fd00:: addresses', () => {
				const { service } = createService();
				expect(service.validateIp('fd00::1')).toEqual({
					allowed: false,
					reason: 'IP address is blocked',
					ip: 'fd00::1',
				});
			});
		});
	});

	describe('warning logs', () => {
		it('should log a warning for invalid IP range entries', () => {
			createService({
				blockedIpRanges: ['not-a-valid-range'],
			});

			expect(mockScopedLogger.warn).toHaveBeenCalledWith(
				"Invalid value 'not-a-valid-range' in N8N_SSRF_BLOCKED_IP_RANGES: Invalid CIDR notation",
			);
		});
	});
});
