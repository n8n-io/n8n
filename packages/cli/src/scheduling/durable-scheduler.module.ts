import type { InstanceType } from '@n8n/constants';
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule, ScheduledMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import type {
	ClaimedTask,
	DispatchDecision,
	DispatchReporter,
	Scheduler,
	TaskHandler,
} from '@n8n/scheduler';

/** The signature a `@Scheduled` method must have to satisfy {@link TaskHandler}. */
type ScheduledMethod = (task: ClaimedTask, report: DispatchReporter) => Promise<DispatchDecision>;

/**
 * Discovers `@Scheduled` handlers for the durable scheduler and registers them
 * with the {@link DurableScheduler}, which then claims only the registered types.
 *
 * `instanceTypes: ['main']` is the coarse lever (the loops run on mains); each
 * `@Scheduled({ instanceTypes })` is the fine lever within that.
 *
 * `init()` does discovery/registration only; starting and stopping the loops
 * stays with the existing `DurableScheduler` wiring (`start.ts` + its
 * `@OnShutdown`).
 */
@BackendModule({ name: 'durable-scheduler', instanceTypes: ['main'] })
export class DurableSchedulerModule implements ModuleInterface {
	async init() {
		const { GlobalConfig } = await import('@n8n/config');
		if (!Container.get(GlobalConfig).scheduler.enabled) return;

		const { InstanceSettings } = await import('n8n-core');
		const { DurableScheduler } = await import('./durable-scheduler.js');
		// Import handler classes so their `@Scheduled` decorators fire before the scan.
		await import('./schedule-trigger-node/schedule-trigger-task-handler.js');

		this.registerScheduledHandlers(
			Container.get(DurableScheduler),
			Container.get(InstanceSettings).instanceType,
		);
	}

	/**
	 * Registers each `@Scheduled` handler eligible for `instanceType` with
	 * `scheduler`, resolving its `@Service` from the container. Returns the task
	 * types registered.
	 */
	registerScheduledHandlers(
		scheduler: Scheduler,
		instanceType: InstanceType,
		metadata: ScheduledMetadata = Container.get(ScheduledMetadata),
	): string[] {
		const registered: string[] = [];

		for (const meta of metadata.getHandlers()) {
			if (meta.instanceTypes && !meta.instanceTypes.includes(instanceType)) continue;

			const instance = Container.get(meta.handlerClass) as Record<string, ScheduledMethod>;
			const handler: TaskHandler = {
				execute: async (task, report) =>
					await instance[meta.methodName].call(instance, task, report),
			};

			scheduler.registerTaskHandler(meta.taskType, handler);
			registered.push(meta.taskType);
		}

		return registered;
	}
}
