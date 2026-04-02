import * as dns from 'node:dns/promises';

import { assertPublicUrl } from '../ssrf-guard';

jest.mock('node:dns/promises');

const mockLookup = dns.lookup as jest.MockedFunction<typeof dns.lookup>;

describe('assertPublicUrl', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('allows public IP addresses', async () => {
		mockLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }] as never);
		await expect(assertPublicUrl('https://example.com')).resolves.toBeUndefined();
	});

	it('blocks non-HTTP(S) schemes', async () => {
		await expect(assertPublicUrl('ftp://example.com')).rejects.toThrow(
			'scheme "ftp:" is not allowed',
		);
	});

	it('blocks file:// scheme', async () => {
		await expect(assertPublicUrl('file:///etc/passwd')).rejects.toThrow(
			'scheme "file:" is not allowed',
		);
	});

	it('blocks 127.x.x.x loopback', async () => {
		mockLookup.mockResolvedValue([{ address: '127.0.0.1', family: 4 }] as never);
		await expect(assertPublicUrl('https://localhost')).rejects.toThrow('private IP');
	});

	it('blocks 10.x.x.x private range', async () => {
		mockLookup.mockResolvedValue([{ address: '10.0.0.1', family: 4 }] as never);
		await expect(assertPublicUrl('https://internal.corp')).rejects.toThrow('private IP');
	});

	it('blocks 172.16.x.x private range', async () => {
		mockLookup.mockResolvedValue([{ address: '172.16.0.1', family: 4 }] as never);
		await expect(assertPublicUrl('https://internal.corp')).rejects.toThrow('private IP');
	});

	it('blocks 192.168.x.x private range', async () => {
		mockLookup.mockResolvedValue([{ address: '192.168.1.1', family: 4 }] as never);
		await expect(assertPublicUrl('https://home.local')).rejects.toThrow('private IP');
	});

	it('blocks 169.254.x.x link-local', async () => {
		mockLookup.mockResolvedValue([{ address: '169.254.169.254', family: 4 }] as never);
		await expect(assertPublicUrl('https://metadata.cloud')).rejects.toThrow('private IP');
	});

	it('blocks IPv6 loopback ::1', async () => {
		mockLookup.mockResolvedValue([{ address: '::1', family: 6 }] as never);
		await expect(assertPublicUrl('https://ipv6-local')).rejects.toThrow('private IPv6');
	});

	it('blocks IPv4 literal private IP', async () => {
		await expect(assertPublicUrl('https://192.168.1.1/path')).rejects.toThrow('private IP');
	});

	it('allows IPv4 literal public IP', async () => {
		await expect(assertPublicUrl('https://8.8.8.8/path')).resolves.toBeUndefined();
	});

	it('handles DNS resolution failure', async () => {
		mockLookup.mockRejectedValue(new Error('ENOTFOUND'));
		await expect(assertPublicUrl('https://nonexistent.invalid')).rejects.toThrow(
			'DNS resolution failed',
		);
	});

	it('blocks when any resolved address is private', async () => {
		mockLookup.mockResolvedValue([
			{ address: '93.184.216.34', family: 4 },
			{ address: '10.0.0.1', family: 4 },
		] as never);
		await expect(assertPublicUrl('https://dual-stack.example')).rejects.toThrow('private IP');
	});

	it('blocks 100.64.x.x carrier-grade NAT (RFC 6598)', async () => {
		mockLookup.mockResolvedValue([{ address: '100.64.0.1', family: 4 }] as never);
		await expect(assertPublicUrl('https://cgnat.internal')).rejects.toThrow('private IP');
	});

	it('blocks 198.18.x.x benchmarking range', async () => {
		mockLookup.mockResolvedValue([{ address: '198.18.0.1', family: 4 }] as never);
		await expect(assertPublicUrl('https://bench.internal')).rejects.toThrow('private IP');
	});

	it('blocks 240.x.x.x reserved range', async () => {
		mockLookup.mockResolvedValue([{ address: '240.0.0.1', family: 4 }] as never);
		await expect(assertPublicUrl('https://reserved.internal')).rejects.toThrow('private IP');
	});

	describe('IPv4-mapped IPv6 addresses', () => {
		it('blocks ::ffff:127.0.0.1 (loopback)', async () => {
			await expect(assertPublicUrl('http://[::ffff:127.0.0.1]:8080/x')).rejects.toThrow('private');
		});

		it('blocks ::ffff:10.0.0.1 (RFC-1918)', async () => {
			await expect(assertPublicUrl('http://[::ffff:10.0.0.1]/x')).rejects.toThrow('private');
		});

		it('blocks ::ffff:192.168.1.1 (RFC-1918)', async () => {
			await expect(assertPublicUrl('http://[::ffff:192.168.1.1]/x')).rejects.toThrow('private');
		});

		it('blocks ::ffff:169.254.169.254 (link-local / cloud metadata)', async () => {
			await expect(assertPublicUrl('http://[::ffff:169.254.169.254]/x')).rejects.toThrow('private');
		});

		it('blocks DNS-resolved IPv4-mapped IPv6 loopback', async () => {
			mockLookup.mockResolvedValue([{ address: '::ffff:127.0.0.1', family: 6 }] as never);
			await expect(assertPublicUrl('https://sneaky.example')).rejects.toThrow('private');
		});

		it('blocks DNS-resolved IPv4-mapped IPv6 private range', async () => {
			mockLookup.mockResolvedValue([{ address: '::ffff:10.0.0.1', family: 6 }] as never);
			await expect(assertPublicUrl('https://sneaky.example')).rejects.toThrow('private');
		});

		it('allows ::ffff: mapped public IP', async () => {
			await expect(assertPublicUrl('http://[::ffff:8.8.8.8]/x')).resolves.toBeUndefined();
		});

		it('blocks hex-pair form loopback (::ffff:7f00:1)', async () => {
			await expect(assertPublicUrl('http://[::ffff:7f00:1]/')).rejects.toThrow('private');
		});

		it('blocks hex-pair form private address (::ffff:a00:1)', async () => {
			await expect(assertPublicUrl('http://[::ffff:a00:1]/')).rejects.toThrow('private');
		});

		it('blocks hex-pair form link-local (::ffff:a9fe:a9fe)', async () => {
			await expect(assertPublicUrl('http://[::ffff:a9fe:a9fe]/')).rejects.toThrow('private');
		});

		it('allows hex-pair form public address (::ffff:808:808)', async () => {
			await expect(assertPublicUrl('http://[::ffff:808:808]/')).resolves.toBeUndefined();
		});
	});

	it('blocks decimal IP for loopback (2130706433 = 127.0.0.1)', async () => {
		await expect(assertPublicUrl('http://2130706433/')).rejects.toThrow('private IP');
	});

	it('blocks hex IP for loopback (0x7f000001 = 127.0.0.1)', async () => {
		await expect(assertPublicUrl('http://0x7f000001/')).rejects.toThrow('private IP');
	});

	it('blocks decimal IP for private range (167772161 = 10.0.0.1)', async () => {
		await expect(assertPublicUrl('http://167772161/')).rejects.toThrow('private IP');
	});

	it('blocks hex IP for metadata endpoint (0xa9fea9fe = 169.254.169.254)', async () => {
		await expect(assertPublicUrl('http://0xa9fea9fe/')).rejects.toThrow('private IP');
	});
});
