import { Scheduled, ScheduledMetadata } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import type {
	ClaimDueTasksBatch,
	ClaimedTask,
	ExecutorTaskStore,
	Scheduler,
	TaskHandler,
} from '@n8n/scheduler';
import {
	createDispatchReporter,
	DEFAULT_EXECUTOR_OPTIONS,
	Executor,
	PrecisionTimer,
	TaskHandlerRegistry,
} from '@n8n/scheduler';
import { mock } from 'vitest-mock-extended';

import { DurableSchedulerModule } from '../durable-scheduler.module';

/** A registry fronted as a `Scheduler` so the module's real target is exercised. */
function schedulerBackedBy(registry: TaskHandlerRegistry): Scheduler {
	return {
		registerTaskHandler: (taskType: string, handler: TaskHandler) =>
			registry.register(taskType, handler),
	} as unknown as Scheduler;
}

function claimedTask(taskType: string): ClaimedTask {
	return {
		id: 'task-1',
		jobId: 1,
		taskType,
		payload: {},
		scheduledFor: new Date(Date.now() + 60_000),
		runAt: new Date(Date.now() + 60_000),
		status: 'running',
		attempts: 0,
		maxAttempts: 3,
		leaseEpoch: 1,
	} as ClaimedTask;
}

describe('DurableSchedulerModule.registerScheduledHandlers', () => {
	let module: DurableSchedulerModule;
	let metadata: ScheduledMetadata;

	beforeEach(() => {
		module = new DurableSchedulerModule();
		metadata = new ScheduledMetadata();
		Container.set(ScheduledMetadata, metadata);
	});

	it('scans @Scheduled handlers, registers them, and the executor claims the type', async () => {
		const executed: string[] = [];

		@Service()
		class ToyHandler {
			@Scheduled({ type: 'poc-toy' })
			async handle(task: ClaimedTask, report: ReturnType<typeof createDispatchReporter>) {
				executed.push(task.taskType);
				return report.dispatched();
			}
		}
		// Reference so the class isn't tree-shaken; import-before-scan is the contract.
		expect(ToyHandler).toBeDefined();

		const registry = new TaskHandlerRegistry();
		const registered = module.registerScheduledHandlers(
			schedulerBackedBy(registry),
			'main',
			metadata,
		);

		expect(registered).toEqual(['poc-toy']);
		expect(registry.registeredTypes()).toContain('poc-toy');

		let claimBatch: ClaimDueTasksBatch | undefined;
		const store = mock<ExecutorTaskStore>();
		store.claimDueTasks.mockImplementation(async (batch) => {
			claimBatch = batch;
			return [claimedTask('poc-toy')];
		});
		// Never-firing timer: we assert the claim, not the later dispatch.
		const timer = new PrecisionTimer({
			now: () => 0,
			setTimer: () => 0 as never,
			clearTimer: () => {},
		});
		const executor = new Executor(store, registry, timer, DEFAULT_EXECUTOR_OPTIONS);

		const claimed = await executor.claimAndSchedule('host-1');

		expect(claimBatch?.taskTypes).toContain('poc-toy');
		expect(claimed.map((t) => t.taskType)).toEqual(['poc-toy']);

		const handler = registry.resolve('poc-toy')!;
		await handler.execute(
			claimedTask('poc-toy'),
			createDispatchReporter(() => {}),
		);
		expect(executed).toEqual(['poc-toy']);
	});

	it('skips a handler whose instanceTypes exclude this instance', () => {
		@Service()
		class WorkerOnlyHandler {
			@Scheduled({ type: 'worker-only', instanceTypes: ['worker'] })
			async handle(_task: ClaimedTask, report: ReturnType<typeof createDispatchReporter>) {
				return report.dispatched();
			}
		}
		expect(WorkerOnlyHandler).toBeDefined();

		const registry = new TaskHandlerRegistry();
		const registered = module.registerScheduledHandlers(
			schedulerBackedBy(registry),
			'main',
			metadata,
		);

		expect(registered).toEqual([]);
		expect(registry.registeredTypes()).toEqual([]);
	});
});
