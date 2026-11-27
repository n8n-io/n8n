import type { DbPoolStats } from '@n8n/db';
import { Gauge, type CollectFunction, type Registry } from 'prom-client';

export interface EngineMetricsOptions {
	/** Where the data plane series register. */
	registry: Registry;
	/** `N8N_METRICS_PREFIX`. Every series is named `<prefix>engine_<name>`. */
	prefix: string;
}

/**
 * The data plane's Prometheus series. The `engine_` part keeps them apart from
 * main's series when both planes share one process and one registry.
 */
export function createEngineMetrics({ registry, prefix }: EngineMetricsOptions) {
	const name = (suffix: string) => `${prefix}engine_${suffix}`;

	return {
		/**
		 * Reports the data plane's own database pool, read on every scrape.
		 * Returns a function that removes the gauges, so a new pool can register
		 * under the same names.
		 */
		registerPool(readStats: () => DbPoolStats | undefined, max: number): () => void {
			const names: string[] = [];
			const gauge = (suffix: string, help: string, collect?: CollectFunction<Gauge>) => {
				const gaugeName = name(`db_pool_${suffix}`);
				names.push(gaugeName);
				return new Gauge({ name: gaugeName, help, registers: [registry], collect });
			};
			const poolGauge = (suffix: string, help: string, value: (stats: DbPoolStats) => number) =>
				gauge(suffix, help, function () {
					const stats = readStats();
					if (stats) this.set(value(stats));
				});

			gauge('connections_max', 'Max size of the engine database connection pool.').set(max);
			poolGauge(
				'connections_active',
				'Number of in-use connections in the engine database connection pool.',
				(stats) => stats.active,
			);
			poolGauge(
				'connections_idle',
				'Number of not-in-use connections in the engine database connection pool.',
				(stats) => stats.idle,
			);
			poolGauge(
				'requests_pending',
				'Number of requests waiting for an available engine database connection.',
				(stats) => stats.waiting,
			);

			return () => {
				for (const gaugeName of names) registry.removeSingleMetric(gaugeName);
			};
		},
	};
}
