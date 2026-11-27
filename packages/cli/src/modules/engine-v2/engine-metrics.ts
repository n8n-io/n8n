import type { DbPoolStats } from '@n8n/db';
import type {
	EngineStores,
	EngineWorkQueues,
	ExecutionStore,
	IStepExecutor,
	WorkQueue,
} from '@n8n/engine';
import { AsyncLocalStorage } from 'node:async_hooks';
import { Counter, Gauge, Histogram, type CollectFunction, type Registry } from 'prom-client';

import { DURATION_BUCKETS_SECONDS } from '@/metrics/prometheus/constant';

export interface EngineMetricsOptions {
	/** Where the data plane series register. */
	registry: Registry;
	/** `N8N_METRICS_PREFIX`. Every series is named `<prefix>engine_<name>`. */
	prefix: string;
	/** The clock for the engine time, in milliseconds. */
	now?: () => number;
}

/** Most orchestration handlers take a few milliseconds, so the buckets start at 1 ms. */
const ENGINE_TIME_BUCKETS_SECONDS = [0.001, 0.0025, ...DURATION_BUCKETS_SECONDS];

const FINISHED_STATUSES = ['completed', 'failed', 'cancelled'] as const;

/**
 * Longest wait for one queue's depth. Prometheus scrapes every series in one
 * call, so a read that hangs, as an LLEN does while Redis is unreachable,
 * would take every other series with it.
 */
const QUEUE_SIZE_TIMEOUT_MS = 1000;

async function readQueueSize(queue: WorkQueue<unknown>): Promise<number | undefined> {
	let timer: NodeJS.Timeout | undefined;
	const timeout = new Promise<undefined>((resolve) => {
		timer = setTimeout(() => resolve(undefined), QUEUE_SIZE_TIMEOUT_MS);
	});
	try {
		return await Promise.race([queue.size(), timeout]);
	} catch {
		return undefined;
	} finally {
		clearTimeout(timer);
	}
}

const engineSeconds = (handlerMs: number, shimMs: number) => Math.max(0, handlerMs - shimMs) / 1000;

/**
 * The data plane series of one runtime. `registerPool`, `wrapQueues` and
 * `wrapStores` register series, so call each one time only.
 */
export type EngineMetrics = ReturnType<typeof createEngineMetrics>;

/**
 * The data plane's Prometheus series. The `engine_` part keeps them apart from
 * main's series when both planes share one process and one registry.
 */
export function createEngineMetrics({
	registry,
	prefix,
	now = () => performance.now(),
}: EngineMetricsOptions) {
	const names: string[] = [];
	const name = (suffix: string) => {
		const metricName = `${prefix}engine_${suffix}`;
		names.push(metricName);
		return metricName;
	};

	/** The v1 shim time of the current queue message. */
	const shimTime = new AsyncLocalStorage<{ ms: number }>();

	return {
		/** Reports the data plane's own database pool, read on every scrape. */
		registerPool(readStats: () => DbPoolStats | undefined, max: number): void {
			const gauge = (suffix: string, help: string, collect?: CollectFunction<Gauge>) =>
				new Gauge({ name: name(`db_pool_${suffix}`), help, registers: [registry], collect });
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
		},

		/**
		 * Returns queues that behave the same and report the queue depth, the
		 * messages in flight and the engine time of each message.
		 */
		wrapQueues(queues: EngineWorkQueues): EngineWorkQueues {
			new Gauge({
				name: name('queue_depth'),
				help: 'Messages on an engine work queue that no data plane has taken yet. Every data plane reads the same queue, so aggregate with max.',
				labelNames: ['queue'],
				registers: [registry],
				async collect() {
					await Promise.all(
						(['orchestration', 'step'] as const).map(async (queue) => {
							const depth = await readQueueSize(queues[queue]);
							// No value rather than a stale one.
							if (depth === undefined) this.remove({ queue });
							else this.set({ queue }, depth);
						}),
					);
				},
			});
			const inFlight = new Gauge({
				name: name('queue_in_flight'),
				help: 'Queue messages whose handler runs in this data plane process now. Aggregate with sum.',
				labelNames: ['queue'],
				registers: [registry],
			});
			const engineTime = new Histogram({
				name: name('handler_engine_time_seconds'),
				help: 'Time a data plane spends on one queue message, without the time in the v1 shim.',
				labelNames: ['queue', 'type'],
				buckets: ENGINE_TIME_BUCKETS_SECONDS,
				registers: [registry],
			});

			const wrap = <TMessage extends { type: string }>(
				queue: keyof EngineWorkQueues,
				inner: WorkQueue<TMessage>,
			): WorkQueue<TMessage> => {
				inFlight.set({ queue }, 0);
				return {
					publish: async (message) => await inner.publish(message),
					stop: async () => await inner.stop(),
					size: async () => await inner.size(),
					start: (handler) =>
						inner.start(async (message) => {
							const shim = { ms: 0 };
							const started = now();
							inFlight.inc({ queue });
							try {
								await shimTime.run(shim, async () => await handler(message));
							} finally {
								inFlight.dec({ queue });
								engineTime.observe(
									{ queue, type: message.type },
									engineSeconds(now() - started, shim.ms),
								);
							}
						}),
				};
			};

			return {
				orchestration: wrap('orchestration', queues.orchestration),
				step: wrap('step', queues.step),
			};
		},

		/** Returns a v1 step executor whose time does not count as engine time. */
		wrapStepExecutor(executor: IStepExecutor): IStepExecutor {
			return {
				execute: async (request) => {
					const started = now();
					try {
						return await executor.execute(request);
					} finally {
						const shim = shimTime.getStore();
						if (shim) shim.ms += now() - started;
					}
				},
			};
		},

		/**
		 * Returns stores whose execution store counts each execution it ends. Only
		 * the write that wins the compare-and-set returns a result, so every
		 * finished execution counts once.
		 */
		wrapStores(stores: EngineStores): EngineStores {
			const finished = new Counter({
				name: name('executions_finished_total'),
				help: 'Executions that this data plane process ended, by terminal status.',
				labelNames: ['status'],
				registers: [registry],
			});
			for (const status of FINISHED_STATUSES) finished.inc({ status }, 0);

			const store = stores.executionStore;
			const finishExecution: ExecutionStore['finishExecution'] = async (id, status) => {
				const result = await store.finishExecution(id, status);
				if (result) finished.inc({ status });
				return result;
			};
			const cancelExecution: ExecutionStore['cancelExecution'] = async (id) => {
				const result = await store.cancelExecution(id);
				if (result) finished.inc({ status: 'cancelled' });
				return result;
			};
			const executionStore = new Proxy(store, {
				get(target, property) {
					if (property === 'finishExecution') return finishExecution;
					if (property === 'cancelExecution') return cancelExecution;
					const value: unknown = Reflect.get(target, property);
					return typeof value === 'function' ? value.bind(target) : value;
				},
			});

			return { ...stores, executionStore };
		},

		/** Removes every series it registered, so a later runtime can register them again. */
		unregister(): void {
			for (const metricName of names) registry.removeSingleMetric(metricName);
		},
	};
}
