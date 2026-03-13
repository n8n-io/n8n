import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { WorkflowTriggerService } from '../workflow-trigger.service';
import { EngineEventBus } from '../event-bus.service';
import type { EngineService } from '../engine.service';
import type { WorkflowStepExecution } from '../../database/entities/workflow-step-execution.entity';

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function createMockDataSource() {
	const mockStepQueryBuilder = {
		update: vi.fn().mockReturnThis(),
		set: vi.fn().mockReturnThis(),
		where: vi.fn().mockReturnThis(),
		execute: vi.fn().mockResolvedValue({ affected: 1 }),
	};

	const mockWorkflowQueryBuilder = {
		where: vi.fn().mockReturnThis(),
		orderBy: vi.fn().mockReturnThis(),
		limit: vi.fn().mockReturnThis(),
		getOne: vi.fn().mockResolvedValue({ id: 'resolved-wf-id', name: 'child-wf-id', version: 1 }),
	};

	// Return appropriate query builder based on the chained call pattern
	const mockRepo = {
		createQueryBuilder: vi.fn((...args: unknown[]) => {
			// If called with an alias (e.g., 'w'), it's a workflow lookup
			if (args.length > 0 && args[0] === 'w') {
				return mockWorkflowQueryBuilder;
			}
			return mockStepQueryBuilder;
		}),
	};

	const dataSource = {
		getRepository: vi.fn().mockReturnValue(mockRepo),
	};

	return { dataSource, mockStepQueryBuilder, mockWorkflowQueryBuilder };
}

function createMockEngineService(): EngineService {
	return {
		startExecution: vi.fn().mockResolvedValue('child-exec-123'),
	} as unknown as EngineService;
}

function createMockParentStep(): WorkflowStepExecution {
	return {
		id: 'parent-step-id',
		executionId: 'parent-exec-id',
		stepId: 'tw-step-1',
		metadata: {},
	} as WorkflowStepExecution;
}

describe('WorkflowTriggerService', () => {
	let eventBus: EngineEventBus;
	let engineService: EngineService;

	beforeEach(() => {
		eventBus = new EngineEventBus();
		engineService = createMockEngineService();
	});

	afterEach(() => {
		eventBus.removeAllListeners();
	});

	it('starts a child execution and resolves when it completes', async () => {
		const { dataSource } = createMockDataSource();
		const service = new WorkflowTriggerService(dataSource as never, engineService, eventBus);
		const parentStep = createMockParentStep();

		// Trigger the child workflow (will start waiting)
		const resultPromise = service.triggerAndAwait(parentStep, {
			workflow: 'child-wf-id',
			input: { key: 'value' },
		});

		// Allow async name resolution + startExecution to complete
		await new Promise<void>((resolve) => setTimeout(resolve, 10));

		// Verify startExecution was called with the resolved workflow ID
		expect(engineService.startExecution).toHaveBeenCalledWith(
			'resolved-wf-id',
			{ key: 'value' },
			'production',
		);
		eventBus.emit({
			type: 'execution:completed',
			executionId: 'child-exec-123',
			result: { childOutput: 'done' },
		});

		const result = await resultPromise;
		expect(result).toEqual({ childOutput: 'done' });
	});

	it('rejects when child execution fails', async () => {
		const { dataSource } = createMockDataSource();
		const service = new WorkflowTriggerService(dataSource as never, engineService, eventBus);
		const parentStep = createMockParentStep();

		const resultPromise = service.triggerAndAwait(parentStep, {
			workflow: 'child-wf-id',
		});

		// Simulate child execution failing
		await new Promise<void>((resolve) => setTimeout(resolve, 10));
		eventBus.emit({
			type: 'execution:failed',
			executionId: 'child-exec-123',
			error: {
				message: 'Step crashed',
				code: 'UNKNOWN',
				category: 'step',
				retriable: false,
			},
		});

		await expect(resultPromise).rejects.toThrow('Child workflow failed: Step crashed');
	});

	it('rejects with timeout error when timeout is exceeded', async () => {
		const { dataSource } = createMockDataSource();
		const service = new WorkflowTriggerService(dataSource as never, engineService, eventBus);
		const parentStep = createMockParentStep();

		const resultPromise = service.triggerAndAwait(parentStep, {
			workflow: 'child-wf-id',
			timeout: 50,
		});

		await expect(resultPromise).rejects.toThrow('Trigger workflow timed out after 50ms');
	});

	it('marks parent step as waiting with childExecutionId in metadata', async () => {
		const { dataSource, mockStepQueryBuilder } = createMockDataSource();
		const service = new WorkflowTriggerService(dataSource as never, engineService, eventBus);
		const parentStep = createMockParentStep();

		const resultPromise = service.triggerAndAwait(parentStep, {
			workflow: 'child-wf-id',
		});

		// Allow async operations to settle
		await new Promise<void>((resolve) => setTimeout(resolve, 10));

		// Verify parent step was updated with waiting status and childExecutionId
		expect(mockStepQueryBuilder.set).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'waiting',
				metadata: expect.objectContaining({
					childExecutionId: 'child-exec-123',
				}),
			}),
		);

		// Complete the child to clean up
		eventBus.emit({
			type: 'execution:completed',
			executionId: 'child-exec-123',
			result: null,
		});
		await resultPromise;
	});

	it('ignores events from unrelated executions', async () => {
		const { dataSource } = createMockDataSource();
		const service = new WorkflowTriggerService(dataSource as never, engineService, eventBus);
		const parentStep = createMockParentStep();

		const resultPromise = service.triggerAndAwait(parentStep, {
			workflow: 'child-wf-id',
			timeout: 200,
		});

		// Emit events for a different execution — should be ignored
		await new Promise<void>((resolve) => setTimeout(resolve, 10));
		eventBus.emit({
			type: 'execution:completed',
			executionId: 'unrelated-exec-id',
			result: { wrong: true },
		});

		// Now emit the correct one
		await new Promise<void>((resolve) => setTimeout(resolve, 10));
		eventBus.emit({
			type: 'execution:completed',
			executionId: 'child-exec-123',
			result: { correct: true },
		});

		const result = await resultPromise;
		expect(result).toEqual({ correct: true });
	});
});
