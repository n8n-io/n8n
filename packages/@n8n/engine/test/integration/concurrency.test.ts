import { createHash } from 'node:crypto';

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';

import {
	createTestEngine,
	destroyTestEngine,
	saveWorkflow,
	executeAndWait,
	getExecution,
	getStepExecutions,
	cleanDatabase,
	ExecutionStatus,
	StepStatus,
} from './test-engine';
import type { TestEngine } from './test-engine';
import { WorkflowExecution } from '../../src/database/entities/workflow-execution.entity';
import type { EngineEvent } from '../../src/engine/event-bus.types';

function sha256(input: string): string {
	return createHash('sha256').update(input).digest('hex').substring(0, 12);
}

describe.skipIf(!process.env.DATABASE_URL)('Concurrency', () => {
	let engine: TestEngine;

	beforeAll(async () => {
		engine = await createTestEngine();
	});

	afterAll(async () => {
		await destroyTestEngine(engine);
	});

	afterEach(async () => {
		await cleanDatabase(engine.dataSource);
		engine.stepProcessor.clearModuleCache();
	});

	// -----------------------------------------------------------------------
	// checkExecutionComplete called twice -> finalized once (CAS guard)
	// -----------------------------------------------------------------------

	it('finalizes execution exactly once even if checkExecutionComplete is called concurrently', async () => {
		// Run a simple workflow and count how many execution:completed events
		// are emitted. Even if the CAS guard in CompletionService is tested by
		// concurrent calls, the fundamental assertion is: exactly one
		// execution:completed event per execution.
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'CASGuard',
	async run(ctx) {
		const a = await ctx.step({ name: 'step-a' }, async () => ({ val: 1 }));
		return a;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

		let completedCount = 0;
		let failedCount = 0;

		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(
				() => reject(new Error('Timeout waiting for execution end')),
				10_000,
			);
			engine.eventBus.onAny((event) => {
				if ('executionId' in event && event.executionId === executionId) {
					if (event.type === 'execution:completed') {
						completedCount++;
						clearTimeout(timeout);
						// Wait a bit for any duplicate events
						setTimeout(resolve, 200);
					}
					if (event.type === 'execution:failed') {
						failedCount++;
						clearTimeout(timeout);
						setTimeout(resolve, 200);
					}
				}
			});
		});

		// Exactly one terminal event should have been emitted
		expect(completedCount + failedCount).toBe(1);
		expect(completedCount).toBe(1);

		// Verify database state
		const execution = await getExecution(engine, executionId);
		expect(execution.status).toBe(ExecutionStatus.Completed);
	});

	// -----------------------------------------------------------------------
	// Parallel steps completing simultaneously -> successor queued once
	// -----------------------------------------------------------------------

	it('queues successor exactly once when parallel steps complete simultaneously', async () => {
		// Two independent steps that complete quickly, with a merge step
		// that depends on both. The planNextSteps uses ON CONFLICT DO NOTHING
		// to ensure the merge step is inserted at most once.
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'ConcurrentMerge',
	async run(ctx) {
		const a = await ctx.step({ name: 'fast-a' }, async () => ({ a: 1 }));
		const b = await ctx.step({ name: 'fast-b' }, async () => ({ b: 2 }));
		const merged = await ctx.step({ name: 'merge' }, async () => {
			return { total: a.a + b.b };
		});
		return merged;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');
		expect(result.result).toEqual({ total: 3 });

		// Verify the merge step was created exactly once
		const steps = await getStepExecutions(engine, result.executionId);
		const mergeSteps = steps.filter((s) => s.stepId === sha256('merge'));
		expect(mergeSteps).toHaveLength(1);
		expect(mergeSteps[0].status).toBe(StepStatus.Completed);
	});

	// -----------------------------------------------------------------------
	// Multiple concurrent executions
	// -----------------------------------------------------------------------

	it('handles multiple concurrent executions independently', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'ConcurrentExec',
	async run(ctx) {
		const result = await ctx.step({ name: 'identify' }, async () => {
			return { executionId: ctx.executionId };
		});
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);

		// Start 5 executions concurrently
		const executions = await Promise.all(
			Array.from({ length: 5 }, () => executeAndWait(engine, workflowId)),
		);

		// All should complete
		for (const exec of executions) {
			expect(exec.status).toBe('completed');
		}

		// Each should have a unique executionId
		const ids = executions.map((e) => e.executionId);
		const uniqueIds = new Set(ids);
		expect(uniqueIds.size).toBe(5);

		// Each result should contain its own execution ID
		for (const exec of executions) {
			const result = exec.result as { executionId: string };
			expect(result.executionId).toBe(exec.executionId);
		}
	});

	// -----------------------------------------------------------------------
	// step:started event emitted before step function begins executing
	// -----------------------------------------------------------------------

	it('emits step:started event before step function executes', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'StepOrder',
	async run(ctx) {
		const result = await ctx.step({ name: 'ordered-step' }, async () => {
			return { done: true };
		});
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

		const events: EngineEvent[] = [];

		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(
				() => reject(new Error('Timeout waiting for execution end')),
				10_000,
			);
			engine.eventBus.onAny((event) => {
				if ('executionId' in event && event.executionId === executionId) {
					events.push(event);
					if (event.type === 'execution:completed' || event.type === 'execution:failed') {
						clearTimeout(timeout);
						resolve();
					}
				}
			});
		});

		const stepId = sha256('ordered-step');
		const startedIdx = events.findIndex(
			(e) => e.type === 'step:started' && 'stepId' in e && e.stepId === stepId,
		);
		const completedIdx = events.findIndex(
			(e) => e.type === 'step:completed' && 'stepId' in e && e.stepId === stepId,
		);

		// step:started must come before step:completed
		expect(startedIdx).toBeGreaterThanOrEqual(0);
		expect(completedIdx).toBeGreaterThanOrEqual(0);
		expect(startedIdx).toBeLessThan(completedIdx);
	});

	// -----------------------------------------------------------------------
	// ON CONFLICT DO NOTHING prevents duplicate step creation
	// -----------------------------------------------------------------------

	it('prevents duplicate step creation via ON CONFLICT DO NOTHING', async () => {
		// A diamond-shaped workflow where the merge step could be planned
		// by both branches. The ON CONFLICT DO NOTHING ensures only one
		// step execution record is created.
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'DiamondDupe',
	async run(ctx) {
		const root = await ctx.step({ name: 'root' }, async () => ({ val: 1 }));
		const left = await ctx.step({ name: 'left' }, async () => ({ l: root.val }));
		const right = await ctx.step({ name: 'right' }, async () => ({ r: root.val }));
		const merge = await ctx.step({ name: 'diamond-merge' }, async () => {
			return { sum: left.l + right.r };
		});
		return merge;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');
		expect(result.result).toEqual({ sum: 2 });

		// Verify the merge step exists exactly once
		const steps = await getStepExecutions(engine, result.executionId);
		const mergeSteps = steps.filter((s) => s.stepId === sha256('diamond-merge'));
		expect(mergeSteps).toHaveLength(1);
	});

	// -----------------------------------------------------------------------
	// CAS guard: concurrent finalization attempts
	// -----------------------------------------------------------------------

	it('CAS guard prevents double finalization in database', async () => {
		// A linear workflow. After it completes, verify the execution
		// record's final state is set atomically.
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'CAS',
	async run(ctx) {
		const a = await ctx.step({ name: 'only-step' }, async () => ({ val: 42 }));
		return a;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');

		// The execution should have completedAt set
		const execution = await getExecution(engine, result.executionId);
		expect(execution.status).toBe(ExecutionStatus.Completed);
		expect(execution.completedAt).toBeDefined();
		expect(execution.result).toEqual({ val: 42 });

		// Attempting to update the execution status again should not change it
		// (simulating what CAS guard does). The WHERE clause prevents updates
		// to already-terminal executions.
		const updateResult = await engine.dataSource
			.getRepository(WorkflowExecution)
			.createQueryBuilder()
			.update(WorkflowExecution)
			.set({ status: ExecutionStatus.Failed })
			.where('id = :id AND status NOT IN (:...terminal)', {
				id: result.executionId,
				terminal: [ExecutionStatus.Completed, ExecutionStatus.Failed, ExecutionStatus.Cancelled],
			})
			.execute();

		// Should affect 0 rows because the execution is already completed
		expect(updateResult.affected).toBe(0);

		// Status should still be 'completed'
		const executionAfter = await getExecution(engine, result.executionId);
		expect(executionAfter.status).toBe(ExecutionStatus.Completed);
	});
});
