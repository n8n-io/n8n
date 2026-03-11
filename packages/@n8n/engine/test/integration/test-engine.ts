import type { DataSource } from '@n8n/typeorm';

import { createTestDataSource, cleanDatabase } from '../helpers';
import { EngineEventBus } from '../../src/engine/event-bus.service';
import { EngineService } from '../../src/engine/engine.service';
import { StepProcessorService } from '../../src/engine/step-processor.service';
import { StepPlannerService } from '../../src/engine/step-planner.service';
import { StepQueueService } from '../../src/engine/step-queue.service';
import { CompletionService } from '../../src/engine/completion.service';
import { BroadcasterService } from '../../src/engine/broadcaster.service';
import { registerEventHandlers } from '../../src/engine/event-handlers';
import { TranspilerService } from '../../src/transpiler/transpiler.service';
import { WorkflowEntity } from '../../src/database/entities/workflow.entity';
import { WorkflowExecution } from '../../src/database/entities/workflow-execution.entity';
import { WorkflowStepExecution } from '../../src/database/entities/workflow-step-execution.entity';
import { ExecutionStatus, StepStatus } from '../../src/database/enums';
import type {
	EngineEvent,
	ExecutionCompletedEvent,
	ExecutionFailedEvent,
} from '../../src/engine/event-bus.types';

export interface TestEngine {
	dataSource: DataSource;
	eventBus: EngineEventBus;
	engineService: EngineService;
	stepProcessor: StepProcessorService;
	stepPlanner: StepPlannerService;
	queue: StepQueueService;
	completionService: CompletionService;
	broadcaster: BroadcasterService;
	transpiler: TranspilerService;
}

export async function createTestEngine(): Promise<TestEngine> {
	const dataSource = await createTestDataSource();
	const eventBus = new EngineEventBus();
	const transpiler = new TranspilerService();
	const stepPlanner = new StepPlannerService(dataSource);
	const completionService = new CompletionService(dataSource, eventBus);
	const stepProcessor = new StepProcessorService(dataSource, eventBus);
	const engineService = new EngineService(dataSource, eventBus, stepPlanner);
	const broadcaster = new BroadcasterService(eventBus);

	registerEventHandlers(eventBus, dataSource, stepPlanner, completionService);

	// Use a shorter poll interval for tests (10ms interval, 20 max concurrency)
	const queue = new StepQueueService(dataSource, stepProcessor, 20, 10);
	queue.start();

	return {
		dataSource,
		eventBus,
		engineService,
		stepProcessor,
		stepPlanner,
		queue,
		completionService,
		broadcaster,
		transpiler,
	};
}

export async function destroyTestEngine(engine: TestEngine): Promise<void> {
	engine.queue.stop();
	engine.eventBus.removeAllListeners();
	await engine.dataSource.destroy();
}

/**
 * Compile workflow source code and save the workflow (version 1)
 * to the database. Returns the workflow ID.
 *
 * The transpiler automatically adds an implicit manual trigger node to
 * the graph, so no manual injection is needed.
 */
export async function saveWorkflow(
	engine: TestEngine,
	source: string,
	options?: { name?: string },
): Promise<string> {
	const result = engine.transpiler.compile(source);

	if (result.errors.length > 0) {
		throw new Error(`Compilation failed: ${result.errors.map((e) => e.message).join(', ')}`);
	}

	const workflowRepo = engine.dataSource.getRepository(WorkflowEntity);

	const id = crypto.randomUUID();

	const workflow = workflowRepo.create({
		id,
		version: 1,
		name: options?.name ?? 'Test Workflow',
		code: source,
		compiledCode: result.code,
		triggers: [],
		settings: {},
		graph: result.graph,
		sourceMap: result.sourceMap,
		active: true,
	});
	await workflowRepo.save(workflow);

	return id;
}

/**
 * Save a new version of an existing workflow. Returns the new version number.
 */
export async function saveWorkflowVersion(
	engine: TestEngine,
	workflowId: string,
	source: string,
	options?: { name?: string },
): Promise<number> {
	const result = engine.transpiler.compile(source);

	if (result.errors.length > 0) {
		throw new Error(`Compilation failed: ${result.errors.map((e) => e.message).join(', ')}`);
	}

	const workflowRepo = engine.dataSource.getRepository(WorkflowEntity);

	// Find latest version
	const latest = await workflowRepo
		.createQueryBuilder('w')
		.where('w.id = :id', { id: workflowId })
		.orderBy('w.version', 'DESC')
		.limit(1)
		.getOne();

	const nextVersion = (latest?.version ?? 0) + 1;

	const workflow = workflowRepo.create({
		id: workflowId,
		version: nextVersion,
		name: options?.name ?? latest?.name ?? 'Test Workflow',
		code: source,
		compiledCode: result.code,
		triggers: [],
		settings: {},
		graph: result.graph,
		sourceMap: result.sourceMap,
		active: latest?.active ?? true,
		deletedAt: latest?.deletedAt ?? null,
	});
	await workflowRepo.save(workflow);

	return nextVersion;
}

/**
 * Wait for a specific event type for a given execution (with timeout).
 */
export function waitForEvent<T extends EngineEvent = EngineEvent>(
	eventBus: EngineEventBus,
	eventType: string,
	executionId: string,
	timeoutMs = 10_000,
): Promise<T> {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject(new Error(`Timeout waiting for ${eventType} on execution ${executionId}`));
		}, timeoutMs);

		eventBus.onAny((event) => {
			if (event.type === eventType && 'executionId' in event && event.executionId === executionId) {
				clearTimeout(timeout);
				resolve(event as T);
			}
		});
	});
}

/**
 * Collect all events emitted for a given execution until it reaches a terminal state.
 */
export function collectEvents(
	eventBus: EngineEventBus,
	executionId: string,
	timeoutMs = 15_000,
): { events: EngineEvent[]; done: Promise<void> } {
	const events: EngineEvent[] = [];

	const done = new Promise<void>((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject(new Error(`Timeout collecting events for execution ${executionId}`));
		}, timeoutMs);

		eventBus.onAny((event) => {
			if ('executionId' in event && event.executionId === executionId) {
				events.push(event);

				if (
					event.type === 'execution:completed' ||
					event.type === 'execution:failed' ||
					event.type === 'execution:cancelled'
				) {
					clearTimeout(timeout);
					resolve();
				}
			}
		});
	});

	return { events, done };
}

/**
 * Execute a workflow and wait for it to complete/fail/cancel.
 */
export async function executeAndWait(
	engine: TestEngine,
	workflowId: string,
	triggerData?: unknown,
	timeoutMs = 15_000,
): Promise<{
	executionId: string;
	status: string;
	result?: unknown;
	error?: unknown;
}> {
	const executionId = await engine.engineService.startExecution(workflowId, triggerData, 'test');

	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			reject(new Error(`Timeout waiting for execution ${executionId} to complete`));
		}, timeoutMs);

		engine.eventBus.on<ExecutionCompletedEvent>('execution:completed', (event) => {
			if (event.executionId === executionId) {
				clearTimeout(timeout);
				resolve({
					executionId,
					status: 'completed',
					result: (event as ExecutionCompletedEvent).result,
				});
			}
		});

		engine.eventBus.on<ExecutionFailedEvent>('execution:failed', (event) => {
			if (event.executionId === executionId) {
				clearTimeout(timeout);
				resolve({ executionId, status: 'failed', error: (event as ExecutionFailedEvent).error });
			}
		});

		engine.eventBus.on('execution:cancelled', (event) => {
			if (event.executionId === executionId) {
				clearTimeout(timeout);
				resolve({ executionId, status: 'cancelled' });
			}
		});
	});
}

/**
 * Load the execution record from the database.
 */
export async function getExecution(
	engine: TestEngine,
	executionId: string,
): Promise<WorkflowExecution> {
	return engine.dataSource.getRepository(WorkflowExecution).findOneByOrFail({ id: executionId });
}

/**
 * Load all step executions for a given execution.
 */
export async function getStepExecutions(
	engine: TestEngine,
	executionId: string,
): Promise<WorkflowStepExecution[]> {
	return engine.dataSource
		.getRepository(WorkflowStepExecution)
		.createQueryBuilder('wse')
		.where('wse.executionId = :executionId', { executionId })
		.orderBy('wse.createdAt', 'ASC')
		.getMany();
}

/**
 * Load a specific step execution by step ID within an execution.
 */
export async function getStepExecution(
	engine: TestEngine,
	executionId: string,
	stepId: string,
): Promise<WorkflowStepExecution | null> {
	return engine.dataSource
		.getRepository(WorkflowStepExecution)
		.createQueryBuilder('wse')
		.where('wse.executionId = :executionId AND wse.stepId = :stepId', {
			executionId,
			stepId,
		})
		.getOne();
}

/**
 * Directly insert a step execution into the database (for setting up
 * specific test scenarios without running the full workflow).
 */
export async function insertStepExecution(
	engine: TestEngine,
	data: Partial<WorkflowStepExecution> & { executionId: string; stepId: string },
): Promise<WorkflowStepExecution> {
	const repo = engine.dataSource.getRepository(WorkflowStepExecution);
	const step = repo.create({
		stepType: 'step',
		status: StepStatus.Queued,
		attempt: 1,
		...data,
	});
	return repo.save(step);
}

/**
 * Directly insert an execution record into the database.
 */
export async function insertExecution(
	engine: TestEngine,
	data: Partial<WorkflowExecution> & { workflowId: string; workflowVersion: number },
): Promise<WorkflowExecution> {
	const repo = engine.dataSource.getRepository(WorkflowExecution);
	const execution = repo.create({
		status: ExecutionStatus.Running,
		mode: 'test',
		startedAt: new Date(),
		...data,
	});
	return repo.save(execution);
}

export { cleanDatabase, ExecutionStatus, StepStatus };
