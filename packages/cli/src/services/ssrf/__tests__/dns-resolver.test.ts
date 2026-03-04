import { mock } from 'jest-mock-extended';
import { promises as dns } from 'node:dns';

import { DnsResolver } from '../dns-resolver';
import type { InMemoryDnsCache } from '../in-memory-dns-cache.service';

jest.mock('node:dns', () => ({
	promises: {
		lookup: jest.fn(),
	},
}));

const mockedDns = jest.mocked(dns);

function asLookupResult(value: unknown): Awaited<ReturnType<typeof dns.lookup>> {
	return value as Awaited<ReturnType<typeof dns.lookup>>;
}

describe('DnsResolver', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should return cached IPs when available', async () => {
		const cache = mock<InMemoryDnsCache>();
		cache.get.mockResolvedValue([{ address: '1.2.3.4', family: 4 }]);
		const resolver = new DnsResolver(cache);

		const result = await resolver.lookup('example.com');

		expect(result).toEqual([{ address: '1.2.3.4', family: 4 }]);
		expect(cache.get).toHaveBeenCalledWith('example.com|a:0|f:0|o:-|v:-|h:0');
		expect(mockedDns.lookup).not.toHaveBeenCalled();
	});

	it('should resolve one address by default (all=false, family=0)', async () => {
		const cache = mock<InMemoryDnsCache>();
		mockedDns.lookup.mockResolvedValue({ address: '93.184.216.34', family: 4 });
		const resolver = new DnsResolver(cache);

		const result = await resolver.lookup('example.com');

		expect(result).toEqual([{ address: '93.184.216.34', family: 4 }]);
		expect(mockedDns.lookup).toHaveBeenCalledWith('example.com', {
			all: false,
			family: 0,
			order: undefined,
			verbatim: undefined,
			hints: undefined,
		});
		expect(cache.set).toHaveBeenCalledWith(
			'example.com|a:0|f:0|o:-|v:-|h:0',
			[{ address: '93.184.216.34', family: 4 }],
			1,
		);
	});

	it('should resolve all addresses when all=true', async () => {
		const cache = mock<InMemoryDnsCache>();
		mockedDns.lookup.mockResolvedValue(
			asLookupResult([
				{ address: '93.184.216.34', family: 4 },
				{ address: '2606:4700::6810:85e5', family: 6 },
			]),
		);
		const resolver = new DnsResolver(cache);

		const result = await resolver.lookup('dualstack.example.com', { all: true });

		expect(result).toEqual([
			{ address: '93.184.216.34', family: 4 },
			{ address: '2606:4700::6810:85e5', family: 6 },
		]);
		expect(mockedDns.lookup).toHaveBeenCalledWith('dualstack.example.com', {
			all: true,
			family: 0,
			order: undefined,
			verbatim: undefined,
			hints: undefined,
		});
		expect(cache.set).toHaveBeenCalledWith(
			'dualstack.example.com|a:1|f:0|o:-|v:-|h:0',
			[
				{ address: '93.184.216.34', family: 4 },
				{ address: '2606:4700::6810:85e5', family: 6 },
			],
			1,
		);
	});

	it('should pass family option through to lookup', async () => {
		const cache = mock<InMemoryDnsCache>();
		mockedDns.lookup.mockResolvedValue(
			asLookupResult([{ address: '2606:4700::6810:85e5', family: 6 }]),
		);
		const resolver = new DnsResolver(cache);

		const result = await resolver.lookup('ipv6.example.com', { all: true, family: 6 });

		expect(result).toEqual([{ address: '2606:4700::6810:85e5', family: 6 }]);
		expect(mockedDns.lookup).toHaveBeenCalledWith('ipv6.example.com', {
			all: true,
			family: 6,
			order: undefined,
			verbatim: undefined,
			hints: undefined,
		});
		expect(cache.set).toHaveBeenCalledWith(
			'ipv6.example.com|a:1|f:6|o:-|v:-|h:0',
			[{ address: '2606:4700::6810:85e5', family: 6 }],
			1,
		);
	});

	it('should include order in lookup options and cache key', async () => {
		const cache = mock<InMemoryDnsCache>();
		mockedDns.lookup.mockResolvedValue({ address: '93.184.216.34', family: 4 });
		const resolver = new DnsResolver(cache);

		await resolver.lookup('ordered.example.com', { order: 'ipv4first' });

		expect(mockedDns.lookup).toHaveBeenCalledWith('ordered.example.com', {
			all: false,
			family: 0,
			order: 'ipv4first',
			verbatim: undefined,
			hints: undefined,
		});
		expect(cache.get).toHaveBeenCalledWith('ordered.example.com|a:0|f:0|o:ipv4first|v:-|h:0');
	});

	it('should include verbatim in lookup options and cache key', async () => {
		const cache = mock<InMemoryDnsCache>();
		mockedDns.lookup.mockResolvedValue({ address: '93.184.216.34', family: 4 });
		const resolver = new DnsResolver(cache);

		await resolver.lookup('verbatim.example.com', { verbatim: true });

		expect(mockedDns.lookup).toHaveBeenCalledWith('verbatim.example.com', {
			all: false,
			family: 0,
			order: undefined,
			verbatim: true,
			hints: undefined,
		});
		expect(cache.get).toHaveBeenCalledWith('verbatim.example.com|a:0|f:0|o:-|v:1|h:0');
	});

	it('should normalize unsupported family values to 0', async () => {
		const cache = mock<InMemoryDnsCache>();
		mockedDns.lookup.mockResolvedValue({ address: '93.184.216.34', family: 4 });
		const resolver = new DnsResolver(cache);

		await resolver.lookup('example.com', { family: 123 });

		expect(mockedDns.lookup).toHaveBeenCalledWith('example.com', {
			all: false,
			family: 0,
			order: undefined,
			verbatim: undefined,
			hints: undefined,
		});
		expect(cache.get).toHaveBeenCalledWith('example.com|a:0|f:0|o:-|v:-|h:0');
	});

	it('should bubble up lookup errors', async () => {
		const cache = mock<InMemoryDnsCache>();
		mockedDns.lookup.mockRejectedValue(new Error('ENOTFOUND'));
		const resolver = new DnsResolver(cache);

		await expect(resolver.lookup('nonexistent.example.com')).rejects.toThrow('ENOTFOUND');
		expect(cache.set).not.toHaveBeenCalled();
	});

	it('should include options in cache key', async () => {
		const cache = mock<InMemoryDnsCache>();
		mockedDns.lookup
			.mockResolvedValueOnce({ address: '1.2.3.4', family: 4 })
			.mockResolvedValueOnce(asLookupResult([{ address: '1.2.3.4', family: 4 }]));
		const resolver = new DnsResolver(cache);

		await resolver.lookup('cache-key.example.com');
		await resolver.lookup('cache-key.example.com', { all: true, family: 4 });

		expect(cache.get).toHaveBeenCalledWith('cache-key.example.com|a:0|f:0|o:-|v:-|h:0');
		expect(cache.get).toHaveBeenCalledWith('cache-key.example.com|a:1|f:4|o:-|v:-|h:0');
	});

	describe('in-flight deduplication', () => {
		it('should coalesce concurrent calls with same hostname and options', async () => {
			const cache = mock<InMemoryDnsCache>();
			mockedDns.lookup.mockResolvedValue({ address: '1.2.3.4', family: 4 });
			const resolver = new DnsResolver(cache);

			const [result1, result2] = await Promise.all([
				resolver.lookup('dedup.example.com'),
				resolver.lookup('dedup.example.com'),
			]);

			expect(mockedDns.lookup).toHaveBeenCalledTimes(1);
			expect(result1).toEqual([{ address: '1.2.3.4', family: 4 }]);
			expect(result2).toEqual([{ address: '1.2.3.4', family: 4 }]);
		});

		it('should not coalesce concurrent calls for different option sets', async () => {
			const cache = mock<InMemoryDnsCache>();
			mockedDns.lookup
				.mockResolvedValueOnce({ address: '1.2.3.4', family: 4 })
				.mockResolvedValueOnce(asLookupResult([{ address: '1.2.3.4', family: 4 }]));
			const resolver = new DnsResolver(cache);

			await Promise.all([
				resolver.lookup('options.example.com'),
				resolver.lookup('options.example.com', { all: true }),
			]);

			expect(mockedDns.lookup).toHaveBeenCalledTimes(2);
		});

		it('should allow new resolve after in-flight completes', async () => {
			const cache = mock<InMemoryDnsCache>();
			cache.get
				.mockResolvedValueOnce(undefined)
				.mockResolvedValueOnce([{ address: '1.2.3.4', family: 4 }]);
			mockedDns.lookup.mockResolvedValue({ address: '1.2.3.4', family: 4 });
			const resolver = new DnsResolver(cache);

			await resolver.lookup('sequential.example.com');
			await resolver.lookup('sequential.example.com');

			expect(mockedDns.lookup).toHaveBeenCalledTimes(1);
		});

		it('should clean up in-flight map even if resolve fails', async () => {
			const cache = mock<InMemoryDnsCache>();
			mockedDns.lookup.mockRejectedValueOnce(new Error('ENOTFOUND'));
			const resolver = new DnsResolver(cache);

			await expect(resolver.lookup('failing.example.com')).rejects.toThrow('ENOTFOUND');

			mockedDns.lookup.mockResolvedValueOnce({ address: '1.2.3.4', family: 4 });
			const result2 = await resolver.lookup('failing.example.com');
			expect(result2).toEqual([{ address: '1.2.3.4', family: 4 }]);
		});
	});
});
