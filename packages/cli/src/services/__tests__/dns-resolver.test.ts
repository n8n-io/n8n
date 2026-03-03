import { promises as dns } from 'node:dns';

import { DnsResolver } from '../dns-resolver';
import type { InMemoryDnsCache } from '../in-memory-dns-cache.service';

jest.mock('node:dns', () => ({
	promises: {
		resolve4: jest.fn(),
		resolve6: jest.fn(),
	},
}));

const mockedDns = jest.mocked(dns);

function createMockCache(): jest.Mocked<InMemoryDnsCache> {
	return {
		get: jest.fn().mockResolvedValue(undefined),
		set: jest.fn().mockResolvedValue(undefined),
		clear: jest.fn().mockResolvedValue(undefined),
	} as unknown as jest.Mocked<InMemoryDnsCache>;
}

describe('DnsResolver', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should return cached IPs when available', async () => {
		const cache = createMockCache();
		cache.get.mockResolvedValue(['1.2.3.4']);
		const resolver = new DnsResolver(cache);

		const result = await resolver.resolve('example.com');

		expect(result).toEqual(['1.2.3.4']);
		expect(mockedDns.resolve4).not.toHaveBeenCalled();
	});

	it('should resolve A records and cache them', async () => {
		const cache = createMockCache();
		mockedDns.resolve4.mockResolvedValue([{ address: '93.184.216.34', ttl: 300 }]);
		const resolver = new DnsResolver(cache);

		const result = await resolver.resolve('example.com');

		expect(result).toEqual(['93.184.216.34']);
		expect(cache.set).toHaveBeenCalledWith('example.com', ['93.184.216.34'], 300);
	});

	it('should fall back to AAAA records when A records fail', async () => {
		const cache = createMockCache();
		mockedDns.resolve4.mockRejectedValue(new Error('ENOTFOUND'));
		mockedDns.resolve6.mockResolvedValue([{ address: '2606:4700::6810:85e5', ttl: 120 }]);
		const resolver = new DnsResolver(cache);

		const result = await resolver.resolve('ipv6-only.example.com');

		expect(result).toEqual(['2606:4700::6810:85e5']);
		expect(cache.set).toHaveBeenCalledWith('ipv6-only.example.com', ['2606:4700::6810:85e5'], 120);
	});

	it('should return empty array when both A and AAAA fail', async () => {
		const cache = createMockCache();
		mockedDns.resolve4.mockRejectedValue(new Error('ENOTFOUND'));
		mockedDns.resolve6.mockRejectedValue(new Error('ENOTFOUND'));
		const resolver = new DnsResolver(cache);

		const result = await resolver.resolve('nonexistent.example.com');

		expect(result).toEqual([]);
	});

	it('should use the minimum TTL across records', async () => {
		const cache = createMockCache();
		mockedDns.resolve4.mockResolvedValue([
			{ address: '1.2.3.4', ttl: 300 },
			{ address: '5.6.7.8', ttl: 60 },
		]);
		const resolver = new DnsResolver(cache);

		await resolver.resolve('multi.example.com');

		expect(cache.set).toHaveBeenCalledWith('multi.example.com', ['1.2.3.4', '5.6.7.8'], 60);
	});

	it('should clamp TTL to at least 1 second', async () => {
		const cache = createMockCache();
		mockedDns.resolve4.mockResolvedValue([{ address: '1.2.3.4', ttl: 0 }]);
		const resolver = new DnsResolver(cache);

		await resolver.resolve('zero-ttl.example.com');

		expect(cache.set).toHaveBeenCalledWith('zero-ttl.example.com', ['1.2.3.4'], 1);
	});

	describe('resolveAll', () => {
		it('should resolve and combine A and AAAA records', async () => {
			const cache = createMockCache();
			mockedDns.resolve4.mockResolvedValue([{ address: '93.184.216.34', ttl: 300 }]);
			mockedDns.resolve6.mockResolvedValue([{ address: '2606:4700::6810:85e5', ttl: 120 }]);
			const resolver = new DnsResolver(cache);

			const result = await resolver.resolveAll('dualstack.example.com');

			expect(result).toEqual(['93.184.216.34', '2606:4700::6810:85e5']);
			expect(cache.set).toHaveBeenCalledWith(
				'all:dualstack.example.com',
				['93.184.216.34', '2606:4700::6810:85e5'],
				120,
			);
		});

		it('should resolve using whichever family is available', async () => {
			const cache = createMockCache();
			mockedDns.resolve4.mockRejectedValue(new Error('ENOTFOUND'));
			mockedDns.resolve6.mockResolvedValue([{ address: '2606:4700::6810:85e5', ttl: 120 }]);
			const resolver = new DnsResolver(cache);

			const result = await resolver.resolveAll('ipv6-only.example.com');

			expect(result).toEqual(['2606:4700::6810:85e5']);
			expect(cache.set).toHaveBeenCalledWith(
				'all:ipv6-only.example.com',
				['2606:4700::6810:85e5'],
				120,
			);
		});
	});

	describe('in-flight deduplication', () => {
		it('should coalesce concurrent resolve calls for the same hostname', async () => {
			const cache = createMockCache();
			mockedDns.resolve4.mockResolvedValue([{ address: '1.2.3.4', ttl: 60 }]);
			const resolver = new DnsResolver(cache);

			const [result1, result2] = await Promise.all([
				resolver.resolve('dedup.example.com'),
				resolver.resolve('dedup.example.com'),
			]);

			// Only one DNS query should have been made
			expect(mockedDns.resolve4).toHaveBeenCalledTimes(1);
			expect(result1).toEqual(['1.2.3.4']);
			expect(result2).toEqual(['1.2.3.4']);
		});

		it('should not coalesce resolve calls for different hostnames', async () => {
			const cache = createMockCache();
			mockedDns.resolve4.mockResolvedValue([{ address: '1.2.3.4', ttl: 60 }]);
			const resolver = new DnsResolver(cache);

			await Promise.all([resolver.resolve('a.example.com'), resolver.resolve('b.example.com')]);

			expect(mockedDns.resolve4).toHaveBeenCalledTimes(2);
		});

		it('should allow new resolve after in-flight completes', async () => {
			const cache = createMockCache();
			mockedDns.resolve4.mockResolvedValue([{ address: '1.2.3.4', ttl: 60 }]);
			const resolver = new DnsResolver(cache);

			await resolver.resolve('sequential.example.com');
			// Cache hit on second call — no new DNS query
			cache.get.mockResolvedValueOnce(['1.2.3.4']);
			await resolver.resolve('sequential.example.com');

			expect(mockedDns.resolve4).toHaveBeenCalledTimes(1);
		});

		it('should clean up in-flight map even if resolve fails', async () => {
			const cache = createMockCache();
			mockedDns.resolve4.mockRejectedValue(new Error('ENOTFOUND'));
			mockedDns.resolve6.mockRejectedValue(new Error('ENOTFOUND'));
			const resolver = new DnsResolver(cache);

			const result1 = await resolver.resolve('failing.example.com');
			expect(result1).toEqual([]);

			// Second call should also make a DNS query (not stuck on failed in-flight)
			mockedDns.resolve4.mockResolvedValue([{ address: '1.2.3.4', ttl: 60 }]);
			const result2 = await resolver.resolve('failing.example.com');
			expect(result2).toEqual(['1.2.3.4']);
		});
	});
});
