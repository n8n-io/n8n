import type { DbPoolStats } from '@n8n/db';
import { Registry } from 'prom-client';

import { createEngineMetrics } from '../engine-metrics';

const valueOf = async (registry: Registry, name: string) =>
	(await registry.getSingleMetric(name)?.get())?.values[0]?.value;

describe('createEngineMetrics', () => {
	describe('registerPool', () => {
		it('reports the pool stats and the pool size under the engine prefix', async () => {
			const registry = new Registry();

			createEngineMetrics({ registry, prefix: 'n8n_' }).registerPool(
				() => ({ active: 3, idle: 2, waiting: 5 }),
				10,
			);

			expect(await valueOf(registry, 'n8n_engine_db_pool_connections_active')).toBe(3);
			expect(await valueOf(registry, 'n8n_engine_db_pool_connections_idle')).toBe(2);
			expect(await valueOf(registry, 'n8n_engine_db_pool_requests_pending')).toBe(5);
			expect(await valueOf(registry, 'n8n_engine_db_pool_connections_max')).toBe(10);
		});

		it('reads the pool on every scrape', async () => {
			const registry = new Registry();
			let stats: DbPoolStats = { active: 1, idle: 1, waiting: 0 };
			createEngineMetrics({ registry, prefix: 'n8n_' }).registerPool(() => stats, 10);
			await registry.metrics();

			stats = { active: 4, idle: 0, waiting: 7 };

			expect(await valueOf(registry, 'n8n_engine_db_pool_requests_pending')).toBe(7);
		});

		it('keeps the last values while the pool reports no stats', async () => {
			const registry = new Registry();
			let stats: DbPoolStats | undefined = { active: 1, idle: 2, waiting: 3 };
			createEngineMetrics({ registry, prefix: 'n8n_' }).registerPool(() => stats, 10);
			await registry.metrics();

			stats = undefined;

			expect(await valueOf(registry, 'n8n_engine_db_pool_requests_pending')).toBe(3);
		});

		it('removes its gauges when unregistered, so a new pool can register', async () => {
			const registry = new Registry();
			const metrics = createEngineMetrics({ registry, prefix: 'n8n_' });
			const unregister = metrics.registerPool(() => ({ active: 0, idle: 0, waiting: 0 }), 10);

			unregister();

			expect(await registry.getMetricsAsJSON()).toEqual([]);
			expect(() =>
				metrics.registerPool(() => ({ active: 0, idle: 0, waiting: 0 }), 10),
			).not.toThrow();
		});
	});
});
