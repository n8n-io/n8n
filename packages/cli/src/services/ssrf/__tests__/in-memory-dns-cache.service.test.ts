import { SsrfProtectionConfig } from '@n8n/config';
import type { LookupAddress } from 'node:dns';

import { InMemoryDnsCache } from '../in-memory-dns-cache.service';

describe('InMemoryDnsCache', () => {
	// lru-cache captures `const perf = performance` at import time and uses perf.now()
	// for TTL checks. jest.useFakeTimers replaces globalThis.performance with a new
	// object, but lru-cache still references the original. We mock performance.now
	// directly so lru-cache sees our controlled time via its captured reference.
	let perfNow: number;

	beforeEach(() => {
		perfNow = 1000;
		jest.spyOn(performance, 'now').mockImplementation(() => perfNow);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	function advanceTime(ms: number) {
		perfNow += ms;
	}

	function createConfig(overrides: Partial<SsrfProtectionConfig> = {}): SsrfProtectionConfig {
		const config = new SsrfProtectionConfig();
		Object.assign(config, overrides);
		return config;
	}

	function addr(address: string, family: 4 | 6 = 4): LookupAddress {
		return { address, family };
	}

	describe('get', () => {
		it('should return undefined for unknown hostname', async () => {
			const cache = new InMemoryDnsCache(createConfig());

			const result = await cache.get('unknown.example.com');

			expect(result).toBeUndefined();
		});
	});

	describe('set and get', () => {
		it('should return cached IPs after set', async () => {
			const cache = new InMemoryDnsCache(createConfig());
			const ips = [addr('1.2.3.4'), addr('5.6.7.8')];

			await cache.set('example.com', ips, 60);
			const result = await cache.get('example.com');

			expect(result).toEqual(ips);
		});

		it('should expire entries after TTL', async () => {
			const cache = new InMemoryDnsCache(createConfig());

			await cache.set('example.com', [addr('1.2.3.4')], 10);

			advanceTime(10_001);

			expect(await cache.get('example.com')).toBeUndefined();
		});

		it('should throw when TTL is not greater than zero', async () => {
			const cache = new InMemoryDnsCache(createConfig());

			await expect(cache.set('example.com', [addr('1.2.3.4')], 0)).rejects.toThrow(
				'DNS cache TTL must be greater than 0',
			);
			await expect(cache.set('example.com', [addr('1.2.3.4')], -1)).rejects.toThrow(
				'DNS cache TTL must be greater than 0',
			);
		});
	});

	describe('LRU eviction', () => {
		it('should evict entries when cache exceeds maxSize', async () => {
			// Each entry value (e.g. [{"address":"1.1.1.1","family":4}]) is ~37 bytes when serialized.
			// maxSize=40 allows only ~1 entry, so older entries get evicted.
			const cache = new InMemoryDnsCache(createConfig({ dnsCacheMaxSize: 40 }));

			await cache.set('first.example.com', [addr('1.1.1.1')], 300);
			await cache.set('second.example.com', [addr('2.2.2.2')], 300);

			expect(await cache.get('second.example.com')).toEqual([addr('2.2.2.2')]);
			expect(await cache.get('first.example.com')).toBeUndefined();
		});

		it('should not evict a recently accessed entry', async () => {
			// maxSize=80 allows ~2 entries (~37 bytes each)
			const cache = new InMemoryDnsCache(createConfig({ dnsCacheMaxSize: 80 }));

			await cache.set('first.example.com', [addr('1.1.1.1')], 300);
			await cache.set('second.example.com', [addr('2.2.2.2')], 300);

			// Touch the first entry to move it to the front
			await cache.get('first.example.com');

			// Adding a third entry should evict the untouched second entry
			await cache.set('third.example.com', [addr('3.3.3.3')], 300);

			// Recently accessed entry should still be present
			expect(await cache.get('first.example.com')).toEqual([addr('1.1.1.1')]);

			// Least recently used entry should have been evicted
			expect(await cache.get('second.example.com')).toBeUndefined();
		});
	});

	describe('clear', () => {
		it('should remove all entries', async () => {
			const cache = new InMemoryDnsCache(createConfig());

			await cache.set('example.com', [addr('1.2.3.4')], 300);
			await cache.set('other.com', [addr('5.6.7.8')], 300);

			await cache.clear();

			expect(await cache.get('example.com')).toBeUndefined();
			expect(await cache.get('other.com')).toBeUndefined();
		});
	});
});
