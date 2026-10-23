import { DataSource, ScheduledJobRepository, ScheduledTaskRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { createScheduler } from '@n8n/scheduler';
import type { Scheduler, SchedulerPasses, SchedulerTaskStore } from '@n8n/scheduler';

import { buildMaterializerTransaction } from '@/scheduling/durable-scheduler';

/** A task store that throws on every call while `partitioned` is set, as if its main lost the database. */
export function partitionable(store: ScheduledTaskRepository) {
	const state = { partitioned: false };
	const proxy = new Proxy(store, {
		get(target, property, receiver) {
			const value: unknown = Reflect.get(target, property, receiver);
			if (typeof value !== 'function') return value;
			return async (...args: unknown[]) => {
				if (state.partitioned) throw new Error('partitioned');
				return await (value as (...a: unknown[]) => Promise<unknown>).apply(target, args);
			};
		},
	});
	return { store: proxy as unknown as SchedulerTaskStore, state };
}

/** One main's scheduler over the shared test database, with held tasks on. */
export function buildHeldTaskMain(hostId: string) {
	const tasks = Container.get(ScheduledTaskRepository);
	const { store, state } = partitionable(tasks);
	const scheduler: Scheduler & SchedulerPasses = createScheduler({
		hostId,
		materializerTransaction: buildMaterializerTransaction(
			Container.get(DataSource),
			Container.get(ScheduledJobRepository),
			tasks,
		),
		taskStore: store,
		executor: {
			leaseSeconds: 30,
			lookaheadSeconds: 5,
			batchSize: 100,
			hold: { shutdownGraceMs: 2_000 },
		},
	});
	return { scheduler, partition: state };
}
