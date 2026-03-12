import type { DataSource } from '@n8n/typeorm';

import { TranspilerService } from '../transpiler/transpiler.service';
import { EngineEventBus } from './event-bus.service';
import { EngineService } from './engine.service';
import { StepProcessorService } from './step-processor.service';
import { StepPlannerService } from './step-planner.service';
import { StepQueueService } from './step-queue.service';
import { CompletionService } from './completion.service';
import { BroadcasterService } from './broadcaster.service';
import { WorkflowTriggerService } from './workflow-trigger.service';
import { BatchExecutorService } from './batch-executor.service';
import { registerEventHandlers } from './event-handlers';

export interface Engine {
	eventBus: EngineEventBus;
	transpiler: TranspilerService;
	stepPlanner: StepPlannerService;
	completionService: CompletionService;
	engineService: EngineService;
	workflowTrigger: WorkflowTriggerService;
	batchExecutor: BatchExecutorService;
	stepProcessor: StepProcessorService;
	broadcaster: BroadcasterService;
	queue: StepQueueService;
}

/**
 * Creates and wires all engine services for a given DataSource.
 *
 * Instantiates the event bus, planner, completion service, processor,
 * engine service, broadcaster, batch executor, workflow trigger, and
 * the step queue. Registers event handlers and connects the adaptive
 * poller so the queue wakes when new steps are queued.
 *
 * Callers are responsible for calling `queue.start()` / `queue.stop()`
 * to control the polling lifecycle.
 */
export function createEngine(dataSource: DataSource): Engine {
	const eventBus = new EngineEventBus();
	const transpiler = new TranspilerService();
	const stepPlanner = new StepPlannerService(dataSource);
	const completionService = new CompletionService(dataSource, eventBus);
	const engineService = new EngineService(dataSource, eventBus, stepPlanner);
	const workflowTrigger = new WorkflowTriggerService(dataSource, engineService, eventBus);
	const batchExecutor = new BatchExecutorService(dataSource, eventBus);
	const stepProcessor = new StepProcessorService(
		dataSource,
		eventBus,
		workflowTrigger,
		batchExecutor,
	);
	const broadcaster = new BroadcasterService(eventBus);

	registerEventHandlers(eventBus, dataSource, stepPlanner, completionService, batchExecutor);

	const queue = new StepQueueService(dataSource, stepProcessor);
	stepPlanner.onStepQueued = () => queue.wake();

	return {
		eventBus,
		transpiler,
		stepPlanner,
		completionService,
		engineService,
		workflowTrigger,
		batchExecutor,
		stepProcessor,
		broadcaster,
		queue,
	};
}
