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

type ScheduledMethod = (task: ClaimedTask, report: DispatchReporter) => Promise<DispatchDecision>;

/**
 * Registers `@Scheduled` handlers with the {@link DurableScheduler} at boot, so
 * it claims only the registered task types. Starting and stopping the loops
 * stays with `DurableScheduler`.
 */
@BackendModule({ name: 'durable-scheduler', instanceTypes: ['main'] })
export class DurableSchedulerModule implements ModuleInterface {
	async init() {
		const { GlobalConfig } = await import('@n8n/config');
		if (!Container.get(GlobalConfig).scheduler.enabled) return;

		const { InstanceSettings } = await import('n8n-core');
		const { DurableScheduler } = await import('@/scheduling/durable-scheduler.js');
		// Import handler classes so their `@Scheduled` decorators fire before the scan.
		await import('@/scheduling/schedule-trigger-node/schedule-trigger-task-handler.js');

		// Import before the scan so the POC handler's `@Scheduled` decorator fires.
		const poc =
			process.env.N8N_SCHEDULER_POC_ENABLED === 'true'
				? await import('@/scheduling/poc/scheduled-poc.service.js')
				: undefined;

		const instanceType = Container.get(InstanceSettings).instanceType;
		this.registerScheduledHandlers(Container.get(DurableScheduler), instanceType);

		if (poc) await Container.get(poc.ScheduledPocService).provisionJob();
	}

	/** Registers each `@Scheduled` handler eligible for `instanceType`, returning the task types registered. */
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
