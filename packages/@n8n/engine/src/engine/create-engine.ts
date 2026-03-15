import type { DataSource } from '@n8n/typeorm';
import { nanoid } from 'nanoid';

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
import { AgentBridgeService } from './agent-bridge.service';
import { registerEventHandlers } from './event-handlers';
import { LocalEventRelay } from './event-relay';
import { RedisEventRelay } from './redis-event-relay';
import { MetricsService } from './metrics.service';
import type { EventRelay } from './event-relay';
import type { EngineConfig } from './engine.config';

export interface Engine {
	config: Required<EngineConfig>;
	relay: EventRelay;
	eventBus: EngineEventBus;
	transpiler: TranspilerService;
	stepPlanner: StepPlannerService;
	completionService: CompletionService;
	engineService: EngineService;
	workflowTrigger: WorkflowTriggerService;
	batchExecutor: BatchExecutorService;
	agentBridge: AgentBridgeService;
	stepProcessor: StepProcessorService;
	broadcaster: BroadcasterService;
	queue: StepQueueService;
	metrics: MetricsService;
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
export function createEngine(dataSource: DataSource, config: EngineConfig = {}): Engine {
	const resolvedConfig: Required<EngineConfig> = {
		redisUrl: config.redisUrl ?? '',
		maxConcurrency: config.maxConcurrency ?? 10,
		instanceId: config.instanceId ?? nanoid(),
		redisChannelPrefix: config.redisChannelPrefix ?? 'default',
	};

	const relay: EventRelay = resolvedConfig.redisUrl
		? new RedisEventRelay(
				resolvedConfig.redisUrl,
				resolvedConfig.instanceId,
				resolvedConfig.redisChannelPrefix,
			)
		: new LocalEventRelay();

	const metrics = new MetricsService();
	const eventBus = new EngineEventBus(relay, metrics);
	const transpiler = new TranspilerService();
	const stepPlanner = new StepPlannerService(dataSource);
	const completionService = new CompletionService(dataSource, eventBus, metrics);
	const engineService = new EngineService(dataSource, eventBus, stepPlanner);
	const workflowTrigger = new WorkflowTriggerService(dataSource, engineService, eventBus);
	const batchExecutor = new BatchExecutorService(dataSource, eventBus);
	const agentBridge = new AgentBridgeService(process.env.AGENT_STATE_DIR ?? '/tmp/agent-state');
	const stepProcessor = new StepProcessorService(
		dataSource,
		eventBus,
		workflowTrigger,
		batchExecutor,
		metrics,
		agentBridge,
	);
	const broadcaster = new BroadcasterService(eventBus, relay, metrics);

	registerEventHandlers(eventBus, dataSource, stepPlanner, completionService, batchExecutor);

	const queue = new StepQueueService(
		dataSource,
		stepProcessor,
		resolvedConfig.maxConcurrency,
		metrics,
	);
	stepPlanner.onStepQueued = () => queue.wake();

	return {
		config: resolvedConfig,
		relay,
		eventBus,
		transpiler,
		stepPlanner,
		completionService,
		engineService,
		workflowTrigger,
		batchExecutor,
		agentBridge,
		stepProcessor,
		broadcaster,
		queue,
		metrics,
	};
}
