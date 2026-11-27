import type { DbPoolStats } from '@n8n/db';
import type {
	EngineStores,
	EngineWorkQueues,
	ExecutionStore,
	IStepExecutor,
	OrchestrationMessage,
	StepMessage,
	WorkQueue,
} from '@n8n/engine';
import { Registry } from 'prom-client';
import { mock } from 'vitest-mock-extended';

import { createEngineMetrics } from '../engine-metrics';

type Labels = Record<string, string>;

/** The value of one series, picked by its full name and its labels. */
const valueOf = async (
	registry: Registry,
	metric: string,
	series = metric,
	labels: Labels = {},
): Promise<number | undefined> => {
	const values = (await registry.getSingleMetric(metric)?.get())?.values ?? [];
	return values.find(
		(value) =>
			((value as { metricName?: string }).metricName ?? metric) === series &&
			Object.entries(labels).every(([key, label]) => value.labels[key] === label),
	)?.value;
};

/** Plain stores, like the runtime builds them, so a spread keeps every store. */
const plainStores = (executionStore = mock<ExecutionStore>()): EngineStores => ({
	executionStore,
	stepStore: mock<EngineStores['stepStore']>(),
	executionViewStore: mock<EngineStores['executionViewStore']>(),
});

/** A queue that hands each delivered message to the handler its consumer registered. */
const fakeQueue = <TMessage>(size = 0) => {
	let handler: ((message: TMessage) => Promise<void>) | undefined;
	const queue = mock<WorkQueue<TMessage>>();
	queue.start.mockImplementation((consumer) => {
		handler = consumer;
	});
	queue.size.mockResolvedValue(size);
	return {
		queue,
		deliver: async (message: TMessage) => {
			if (!handler) throw new Error('no consumer started');
			await handler(message);
		},
	};
};

const settled: OrchestrationMessage = { type: 'step:settled', executionId: 'e1', stepId: 's1' };
const ready: StepMessage = { type: 'step:ready', executionId: 'e1', stepId: 's1' };

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
	});

	describe('wrapQueues', () => {
		const wrap = (sizes = { orchestration: 0, step: 0 }, now?: () => number) => {
			const registry = new Registry();
			const metrics = createEngineMetrics({ registry, prefix: 'n8n_', now });
			const orchestration = fakeQueue<OrchestrationMessage>(sizes.orchestration);
			const step = fakeQueue<StepMessage>(sizes.step);
			const queues: EngineWorkQueues = { orchestration: orchestration.queue, step: step.queue };
			const wrapped = metrics.wrapQueues(queues);
			return { registry, metrics, orchestration, step, queues, wrapped };
		};

		it('counts a message as in flight while its handler runs', async () => {
			const { registry, wrapped, step } = wrap();
			let duringRun: number | undefined;
			wrapped.step.start(async () => {
				duringRun = await valueOf(registry, 'n8n_engine_queue_in_flight', undefined, {
					queue: 'step',
				});
			});

			await step.deliver(ready);

			expect(duringRun).toBe(1);
			expect(
				await valueOf(registry, 'n8n_engine_queue_in_flight', undefined, { queue: 'step' }),
			).toBe(0);
		});

		it('counts a message out and records its time when its handler throws', async () => {
			const { registry, wrapped, orchestration } = wrap();
			wrapped.orchestration.start(async () => {
				throw new Error('handler failed');
			});

			await expect(orchestration.deliver(settled)).rejects.toThrow('handler failed');

			expect(
				await valueOf(registry, 'n8n_engine_queue_in_flight', undefined, {
					queue: 'orchestration',
				}),
			).toBe(0);
			expect(
				await valueOf(
					registry,
					'n8n_engine_handler_engine_time_seconds',
					'n8n_engine_handler_engine_time_seconds_count',
					{ queue: 'orchestration', type: 'step:settled' },
				),
			).toBe(1);
		});

		it('records the engine time of each message by queue and type', async () => {
			let clock = 0;
			const { registry, wrapped, orchestration } = wrap(undefined, () => clock);
			wrapped.orchestration.start(async () => {
				clock += 3;
			});

			await orchestration.deliver(settled);

			const series = { queue: 'orchestration', type: 'step:settled' };
			const metric = 'n8n_engine_handler_engine_time_seconds';
			expect(await valueOf(registry, metric, `${metric}_count`, series)).toBe(1);
			expect(await valueOf(registry, metric, `${metric}_sum`, series)).toBeCloseTo(0.003);
		});

		it('leaves the time the v1 shim runs a node out of the engine time', async () => {
			let clock = 0;
			const { registry, metrics, wrapped, step } = wrap(undefined, () => clock);
			const shim = mock<IStepExecutor>();
			shim.execute.mockImplementation(async () => {
				clock += 100;
				return {} as Awaited<ReturnType<IStepExecutor['execute']>>;
			});
			const wrappedShim = metrics.wrapStepExecutor(shim);
			wrapped.step.start(async () => {
				clock += 30;
				await wrappedShim.execute(mock());
				clock += 5;
			});

			await step.deliver(ready);

			const metric = 'n8n_engine_handler_engine_time_seconds';
			expect(
				await valueOf(registry, metric, `${metric}_sum`, { queue: 'step', type: 'step:ready' }),
			).toBeCloseTo(0.035);
		});

		it('reports the queue depth from each queue', async () => {
			const { registry } = wrap({ orchestration: 2, step: 7 });

			expect(
				await valueOf(registry, 'n8n_engine_queue_depth', undefined, { queue: 'orchestration' }),
			).toBe(2);
			expect(await valueOf(registry, 'n8n_engine_queue_depth', undefined, { queue: 'step' })).toBe(
				7,
			);
		});

		it('drops the depth of a queue it cannot read in time, and keeps the other series', async () => {
			const { registry, orchestration, step } = wrap({ orchestration: 2, step: 7 });
			await registry.metrics();
			orchestration.queue.size.mockRejectedValue(new Error('Redis is down'));
			step.queue.size.mockReturnValue(new Promise(() => {}));
			vi.useFakeTimers();
			try {
				const scrape = registry.metrics();
				await vi.advanceTimersByTimeAsync(1000);
				const output = await scrape;

				expect(output).not.toContain('n8n_engine_queue_depth{');
				expect(output).toContain('n8n_engine_queue_in_flight{queue="step"} 0');
			} finally {
				vi.useRealTimers();
			}
		});

		it('keeps publish, stop and size of the queue it wraps', async () => {
			const { wrapped, step } = wrap({ orchestration: 0, step: 4 });

			await wrapped.step.publish(ready);
			await wrapped.step.stop();

			expect(step.queue.publish).toHaveBeenCalledWith(ready);
			expect(step.queue.stop).toHaveBeenCalled();
			expect(await wrapped.step.size()).toBe(4);
		});
	});

	describe('wrapStores', () => {
		const wrap = () => {
			const registry = new Registry();
			const executionStore = mock<ExecutionStore>();
			const stores = plainStores(executionStore);
			const wrapped = createEngineMetrics({ registry, prefix: 'n8n_' }).wrapStores(stores);
			const finished = async (status: string) =>
				await valueOf(registry, 'n8n_engine_executions_finished_total', undefined, { status });
			return { executionStore, stores, wrapped, finished };
		};

		it('reports every terminal status from zero', async () => {
			const { finished } = wrap();

			expect(await finished('completed')).toBe(0);
			expect(await finished('failed')).toBe(0);
			expect(await finished('cancelled')).toBe(0);
		});

		it('counts an execution that its finish write ended, by status', async () => {
			const { executionStore, wrapped, finished } = wrap();
			executionStore.finishExecution.mockResolvedValue({ finishedAt: new Date() });

			await wrapped.executionStore.finishExecution('e1', 'failed');

			expect(executionStore.finishExecution).toHaveBeenCalledWith('e1', 'failed');
			expect(await finished('failed')).toBe(1);
			expect(await finished('completed')).toBe(0);
		});

		it('counts nothing when another write ended the execution first', async () => {
			const { executionStore, wrapped, finished } = wrap();
			executionStore.finishExecution.mockResolvedValue(null);
			executionStore.cancelExecution.mockResolvedValue(null);

			await wrapped.executionStore.finishExecution('e1', 'completed');
			await wrapped.executionStore.cancelExecution('e1');

			expect(await finished('completed')).toBe(0);
			expect(await finished('cancelled')).toBe(0);
		});

		it('counts an execution that its cancel ended as cancelled', async () => {
			const { executionStore, wrapped, finished } = wrap();
			executionStore.cancelExecution.mockResolvedValue({ finishedAt: new Date() });

			await wrapped.executionStore.cancelExecution('e1');

			expect(await finished('cancelled')).toBe(1);
		});

		it('leaves the other stores and the other execution store methods as they are', async () => {
			const { executionStore, stores, wrapped } = wrap();
			executionStore.transitionStatus.mockResolvedValue(true);

			expect(await wrapped.executionStore.transitionStatus('e1', 'queued', 'running')).toBe(true);
			expect(wrapped.stepStore).toBe(stores.stepStore);
			expect(wrapped.executionViewStore).toBe(stores.executionViewStore);
		});
	});

	describe('unregister', () => {
		it('removes every series, so a new runtime can register them again', async () => {
			const registry = new Registry();
			const register = () => {
				const metrics = createEngineMetrics({ registry, prefix: 'n8n_' });
				metrics.registerPool(() => ({ active: 0, idle: 0, waiting: 0 }), 10);
				metrics.wrapQueues({
					orchestration: fakeQueue<OrchestrationMessage>().queue,
					step: fakeQueue<StepMessage>().queue,
				});
				metrics.wrapStores(plainStores());
				return metrics;
			};

			register().unregister();

			expect(await registry.getMetricsAsJSON()).toEqual([]);
			expect(register).not.toThrow();
		});
	});
});
