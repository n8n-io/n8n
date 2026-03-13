import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { EngineEventBus } from '../event-bus.service';
import { registerEventHandlers } from '../event-handlers';
import type { StepPlannerService } from '../step-planner.service';
import type { CompletionService } from '../completion.service';
import type { StepCompletedEvent, StepFailedEvent, StepCancelledEvent } from '../event-bus.types';
import { ExecutionStatus } from '../../database/enums';

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/** Creates a minimal mock DataSource that returns mock repositories. */
function createMockDataSource() {
	const mockQueryBuilder = {
		update: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		andWhere: vi.fn().mockReturnThis(),
		into: vi.fn().mockReturnThis(),
		execute: vi.fn().mockResolvedValue({ affected: 1 }),
		getMany: vi.fn().mockResolvedValue([]),
		getOne: vi.fn().mockResolvedValue(null),
		getCount: vi.fn().mockResolvedValue(0),
		select: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
	};

	const mockRepo = {
		findOneByOrFail: vi.fn(),
		createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
	};

	const dataSource = {
		getRepository: vi.fn().mockReturnValue(mockRepo),
	};

	return { dataSource, mockRepo, mockQueryBuilder };
}

/** Creates a mock StepPlannerService. */
function createMockStepPlanner(): StepPlannerService {
	return {
		planNextSteps: vi.fn().mockResolvedValue(undefined),
		gatherStepInput: vi.fn().mockResolvedValue({}),
	} as unknown as StepPlannerService;
}

/** Creates a mock CompletionService. */
function createMockCompletionService(): CompletionService {
	return {
		checkExecutionComplete: vi.fn().mockResolvedValue(undefined),
	} as unknown as CompletionService;
}

/**
 * Creates a mock workflow with a simple graph:
 * trigger -> step-1 -> step-2
 */
function createMockWorkflowData() {
	return {
		graph: {
			nodes: [
				{
					id: 'trigger-1',
					name: 'Trigger',
					type: 'trigger',
					stepFunctionRef: 'triggerFn',
					config: {},
				},
				{
					id: 'step-1',
					name: 'Step 1',
					type: 'step',
					stepFunctionRef: 'step1Fn',
					config: {},
				},
				{
					id: 'step-2',
					name: 'Step 2',
					type: 'step',
					stepFunctionRef: 'step2Fn',
					config: {},
				},
			],
			edges: [
				{ from: 'trigger-1', to: 'step-1' },
				{ from: 'step-1', to: 'step-2' },
			],
		},
	};
}

describe('registerEventHandlers', () => {
	let eventBus: EngineEventBus;
	let stepPlanner: StepPlannerService;
	let completionService: CompletionService;

	beforeEach(() => {
		eventBus = new EngineEventBus();
		stepPlanner = createMockStepPlanner();
		completionService = createMockCompletionService();
	});

	afterEach(() => {
		eventBus.removeAllListeners();
	});

	// -----------------------------------------------------------------------
	// step:completed handler
	// -----------------------------------------------------------------------

	describe('step:completed handler', () => {
		it('resolves parent step when parentStepExecutionId is present', async () => {
			const { dataSource, mockRepo } = createMockDataSource();
			const workflowData = createMockWorkflowData();

			// Mock the parent step lookup (first call) and execution lookup (second call)
			mockRepo.findOneByOrFail
				.mockResolvedValueOnce({
					id: 'parent-exec-id',
					executionId: 'exec-1',
					stepId: 'parent-step',
					parentStepExecutionId: null,
				})
				.mockResolvedValueOnce({
					id: 'exec-1',
					workflowId: 'wf-1',
					workflowVersion: 1,
					pauseRequested: false,
				});

			// Mock workflow lookup for the cascading step:completed event on the parent
			const mockWorkflowQb = {
				where: vi.fn().mockReturnThis(),
				getOneOrFail: vi.fn().mockResolvedValue(workflowData),
			};
			dataSource.getRepository.mockImplementation((entity: unknown) => {
				if (entity === 'WorkflowEntity') {
					return {
						createQueryBuilder: vi.fn().mockReturnValue(mockWorkflowQb),
					};
				}
				return mockRepo;
			});

			registerEventHandlers(eventBus, dataSource as never, stepPlanner, completionService);

			const event: StepCompletedEvent = {
				type: 'step:completed',
				executionId: 'exec-1',
				stepId: 'child-step',
				output: { result: 'from-child' },
				durationMs: 50,
				parentStepExecutionId: 'parent-exec-id',
			};

			eventBus.emit(event);

			// Allow async handlers to complete (including cascading parent resolution)
			await new Promise<void>((resolve) => setTimeout(resolve, 100));

			// Verify the parent step was looked up
			expect(mockRepo.findOneByOrFail).toHaveBeenCalledWith({
				id: 'parent-exec-id',
			});
		});

		it('calls planNextSteps and checkExecutionComplete for normal step completion', async () => {
			const { dataSource, mockRepo } = createMockDataSource();
			const workflowData = createMockWorkflowData();

			// Mock execution lookup (for loadWorkflowForExecution)
			mockRepo.findOneByOrFail.mockResolvedValue({
				id: 'exec-1',
				workflowId: 'wf-1',
				workflowVersion: 1,
				pauseRequested: false,
			});

			// Mock workflow lookup
			const mockWorkflowQb = {
				where: vi.fn().mockReturnThis(),
				getOneOrFail: vi.fn().mockResolvedValue(workflowData),
			};
			dataSource.getRepository.mockImplementation((entity: string) => {
				if (entity === 'WorkflowEntity') {
					return {
						createQueryBuilder: vi.fn().mockReturnValue(mockWorkflowQb),
					};
				}
				return mockRepo;
			});

			registerEventHandlers(eventBus, dataSource as never, stepPlanner, completionService);

			const event: StepCompletedEvent = {
				type: 'step:completed',
				executionId: 'exec-1',
				stepId: 'step-1',
				output: { value: 42 },
				durationMs: 100,
			};

			eventBus.emit(event);

			await new Promise<void>((resolve) => setTimeout(resolve, 50));

			expect(stepPlanner.planNextSteps).toHaveBeenCalledWith(
				'exec-1',
				'step-1',
				{ value: 42 },
				expect.any(Object), // WorkflowGraph instance
			);

			expect(completionService.checkExecutionComplete).toHaveBeenCalledWith(
				'exec-1',
				expect.any(Object), // WorkflowGraph instance
			);
		});
	});

	// -----------------------------------------------------------------------
	// step:failed handler
	// -----------------------------------------------------------------------

	describe('step:failed handler', () => {
		it('fails parent step when parentStepExecutionId is present', async () => {
			const { dataSource, mockRepo } = createMockDataSource();
			const workflowData = createMockWorkflowData();

			mockRepo.findOneByOrFail.mockResolvedValue({
				id: 'parent-exec-id',
				executionId: 'exec-1',
				stepId: 'parent-step',
				parentStepExecutionId: null,
				workflowId: 'wf-1',
				workflowVersion: 1,
				startedAt: new Date(), // Also used by fail-fast path when re-emitted
			});

			// Mock workflow lookup (needed for cascading step:failed event on the parent)
			const mockWorkflowQb = {
				where: vi.fn().mockReturnThis(),
				getOneOrFail: vi.fn().mockResolvedValue(workflowData),
			};
			dataSource.getRepository.mockImplementation((entity: unknown) => {
				if (entity === 'WorkflowEntity') {
					return {
						createQueryBuilder: vi.fn().mockReturnValue(mockWorkflowQb),
					};
				}
				return mockRepo;
			});

			registerEventHandlers(eventBus, dataSource as never, stepPlanner, completionService);

			const event: StepFailedEvent = {
				type: 'step:failed',
				executionId: 'exec-1',
				stepId: 'child-step',
				error: {
					message: 'child failed',
					code: 'UNKNOWN',
					category: 'step',
					retriable: false,
				},
				parentStepExecutionId: 'parent-exec-id',
			};

			eventBus.emit(event);

			await new Promise<void>((resolve) => setTimeout(resolve, 50));

			// Should have looked up the parent step
			expect(mockRepo.findOneByOrFail).toHaveBeenCalledWith({
				id: 'parent-exec-id',
			});
		});

		it('marks execution as failed (fail fast) for non-child step failure', async () => {
			const { dataSource, mockRepo, mockQueryBuilder } = createMockDataSource();
			const workflowData = createMockWorkflowData();

			// findOneByOrFail needs to return an execution with startedAt
			mockRepo.findOneByOrFail.mockResolvedValue({
				id: 'exec-1',
				workflowId: 'wf-1',
				workflowVersion: 1,
				startedAt: new Date(),
			});

			// Mock workflow lookup (needed to check for error handlers in graph)
			const mockWorkflowQb = {
				where: vi.fn().mockReturnThis(),
				getOneOrFail: vi.fn().mockResolvedValue(workflowData),
			};
			dataSource.getRepository.mockImplementation((entity: unknown) => {
				if (entity === 'WorkflowEntity') {
					return {
						createQueryBuilder: vi.fn().mockReturnValue(mockWorkflowQb),
					};
				}
				return mockRepo;
			});

			registerEventHandlers(eventBus, dataSource as never, stepPlanner, completionService);

			const failedEvents: Array<{ type: string }> = [];
			eventBus.on('execution:failed', (event) => {
				failedEvents.push(event);
			});

			const event: StepFailedEvent = {
				type: 'step:failed',
				executionId: 'exec-1',
				stepId: 'step-1',
				error: {
					message: 'step crashed',
					code: 'UNKNOWN',
					category: 'step',
					retriable: false,
				},
			};

			eventBus.emit(event);

			await new Promise<void>((resolve) => setTimeout(resolve, 50));

			// Should have called update on the execution to mark it failed
			expect(mockQueryBuilder.update).toHaveBeenCalled();
			expect(mockQueryBuilder.set).toHaveBeenCalledWith(
				expect.objectContaining({
					status: ExecutionStatus.Failed,
					cancelRequested: true,
				}),
			);
		});
	});

	// -----------------------------------------------------------------------
	// step:cancelled handler
	// -----------------------------------------------------------------------

	describe('step:cancelled handler', () => {
		it('checks execution completion when a step is cancelled', async () => {
			const { dataSource, mockRepo } = createMockDataSource();
			const workflowData = createMockWorkflowData();

			mockRepo.findOneByOrFail.mockResolvedValue({
				id: 'exec-1',
				workflowId: 'wf-1',
				workflowVersion: 1,
			});

			const mockWorkflowQb = {
				where: vi.fn().mockReturnThis(),
				getOneOrFail: vi.fn().mockResolvedValue(workflowData),
			};
			dataSource.getRepository.mockImplementation((entity: string) => {
				if (entity === 'WorkflowEntity') {
					return {
						createQueryBuilder: vi.fn().mockReturnValue(mockWorkflowQb),
					};
				}
				return mockRepo;
			});

			registerEventHandlers(eventBus, dataSource as never, stepPlanner, completionService);

			const event: StepCancelledEvent = {
				type: 'step:cancelled',
				executionId: 'exec-1',
				stepId: 'step-1',
			};

			eventBus.emit(event);

			await new Promise<void>((resolve) => setTimeout(resolve, 50));

			expect(completionService.checkExecutionComplete).toHaveBeenCalledWith(
				'exec-1',
				expect.any(Object),
			);
		});
	});
});
