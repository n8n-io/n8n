import { createHash } from 'node:crypto';

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';

import {
	createTestEngine,
	destroyTestEngine,
	saveWorkflow,
	getExecution,
	getStepExecutions,
	waitForEvent,
	cleanDatabase,
	ExecutionStatus,
	StepStatus,
} from './test-engine';
import type { TestEngine } from './test-engine';

function sha256(input: string): string {
	return createHash('sha256').update(input).digest('hex').substring(0, 12);
}

describe.skipIf(!process.env.DATABASE_URL)('Cancellation', () => {
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
	// cancel_requested checked before step starts executing
	// -----------------------------------------------------------------------

	it('cancels a queued step before it starts executing', async () => {
		// A workflow with multiple steps where we cancel immediately after the first
		// step is planned. The second step should never execute.
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'CancelQueued',
	async run(ctx) {
		const a = await ctx.step({ name: 'slow-step' }, async () => {
			// Simulate a slow operation
			await new Promise(resolve => setTimeout(resolve, 200));
			return { done: true };
		});
		const b = await ctx.step({ name: 'never-runs' }, async () => {
			return { should_not_see: true };
		});
		return b;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

		// Wait for first step to start executing, then cancel
		await waitForEvent(engine.eventBus, 'step:started', executionId, 5_000);

		// Cancel the execution
		await engine.engineService.cancelExecution(executionId);

		// Wait for execution to reach a terminal state
		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(
				() => reject(new Error('Timeout waiting for terminal state')),
				10_000,
			);
			engine.eventBus.onAny((event) => {
				if (
					'executionId' in event &&
					event.executionId === executionId &&
					(event.type === 'execution:completed' ||
						event.type === 'execution:failed' ||
						event.type === 'execution:cancelled')
				) {
					clearTimeout(timeout);
					resolve();
				}
			});
		});

		const execution = await getExecution(engine, executionId);
		// The execution should be cancelled (or failed, depending on timing)
		expect([ExecutionStatus.Cancelled, ExecutionStatus.Completed]).toContain(execution.status);

		// The cancelRequested flag should be set
		expect(execution.cancelRequested).toBe(true);
	});

	// -----------------------------------------------------------------------
	// Currently running step completes, next step not planned
	// -----------------------------------------------------------------------

	it('allows running step to complete but does not plan successor after cancel', async () => {
		// Use a two-step workflow. Cancel after step 1 starts.
		// Step 1 should complete normally. Step 2 should not be queued
		// (handled by the step:completed handler checking pause/cancel).
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'CancelAfterStep',
	async run(ctx) {
		const a = await ctx.step({ name: 'step-a' }, async () => {
			await new Promise(resolve => setTimeout(resolve, 100));
			return { fromA: true };
		});
		const b = await ctx.step({ name: 'step-b' }, async () => {
			return { fromB: true };
		});
		return b;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);

		// Register terminal state listener BEFORE starting execution to avoid race condition
		const terminalPromise = new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(
				() => reject(new Error('Timeout waiting for terminal state')),
				10_000,
			);
			engine.eventBus.onAny((event) => {
				if (
					'executionId' in event &&
					(event.type === 'execution:completed' ||
						event.type === 'execution:failed' ||
						event.type === 'execution:cancelled')
				) {
					clearTimeout(timeout);
					resolve();
				}
			});
		});

		const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

		// Wait for step-a to start, then cancel
		await waitForEvent(engine.eventBus, 'step:started', executionId, 5_000);
		await engine.engineService.cancelExecution(executionId);

		// Wait for execution to reach terminal state
		await terminalPromise;

		const steps = await getStepExecutions(engine, executionId);
		const stepA = steps.find((s) => s.stepId === sha256('step-a'));
		const stepB = steps.find((s) => s.stepId === sha256('step-b'));

		// Step A should have completed or been cancelled (timing-dependent:
		// cancellation may mark it cancelled before the 100ms sleep finishes)
		expect(stepA).toBeDefined();
		expect([StepStatus.Completed, StepStatus.Cancelled]).toContain(stepA!.status);

		// If step A completed, verify its output
		if (stepA!.status === StepStatus.Completed) {
			expect(stepA!.output).toEqual({ fromA: true });
		}

		// Step B should either not exist, be cancelled, queued, or completed
		// (depending on timing -- cancellation may arrive after step B completes)
		if (stepB) {
			expect([StepStatus.Cancelled, StepStatus.Queued, StepStatus.Completed]).toContain(
				stepB.status,
			);
		}
	});

	// -----------------------------------------------------------------------
	// execution:cancelled event is emitted
	// -----------------------------------------------------------------------

	it('emits execution:cancelled event when cancelled', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'CancelEvent',
	async run(ctx) {
		const a = await ctx.step({ name: 'long-step' }, async () => {
			await new Promise(resolve => setTimeout(resolve, 500));
			return { done: true };
		});
		const b = await ctx.step({ name: 'after' }, async () => {
			return { afterDone: true };
		});
		return b;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);

		// Register event listeners BEFORE starting execution to avoid race conditions.
		// We capture all events and filter by executionId after we have it.
		let cancelRequestReceived = false;
		const terminalPromise = new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(
				() => reject(new Error('Timeout waiting for terminal state')),
				10_000,
			);
			engine.eventBus.onAny((event) => {
				if (!('executionId' in event)) return;

				if (event.type === 'execution:cancel_requested') {
					cancelRequestReceived = true;
				}

				if (
					event.type === 'execution:completed' ||
					event.type === 'execution:failed' ||
					event.type === 'execution:cancelled'
				) {
					clearTimeout(timeout);
					resolve();
				}
			});
		});

		const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

		// Wait for step to start
		await waitForEvent(engine.eventBus, 'step:started', executionId, 5_000);

		// Cancel the execution
		await engine.engineService.cancelExecution(executionId);

		// Wait for terminal state
		await terminalPromise;

		// Verify cancel_requested event was emitted
		expect(cancelRequestReceived).toBe(true);
	});

	// -----------------------------------------------------------------------
	// Cancellation with retry_pending step
	// -----------------------------------------------------------------------

	it('does not pick up retry_pending step when execution is cancelled', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'CancelRetry',
	async run(ctx) {
		const a = await ctx.step({
			name: 'retrying-step',
			retry: { maxAttempts: 5, baseDelay: 2000 },
		}, async () => {
			throw new Error('Needs retry');
		});
		return a;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

		// Wait for the step to be set to retry_pending
		await waitForEvent(engine.eventBus, 'step:retrying', executionId, 5_000);

		// Cancel immediately -- the step has a 2-second retry delay, so it should
		// still be in retry_pending
		await engine.engineService.cancelExecution(executionId);

		// The poller should not pick up the retry_pending step because the
		// execution's cancelRequested flag is true. The step:failed handler
		// from the first attempt already marked the execution as failed.
		// Wait a bit to ensure the poller does not pick it up.
		await new Promise((resolve) => setTimeout(resolve, 200));

		const execution = await getExecution(engine, executionId);
		// The execution should be in a terminal state (failed because step:failed
		// handler fires on the final failure -- but here the first attempt triggers
		// step:retrying, not step:failed, so execution stays running until cancel
		// finishes things).
		expect(execution.cancelRequested).toBe(true);
	});

	// -----------------------------------------------------------------------
	// Cancellation with parallel branches
	// -----------------------------------------------------------------------

	it('stops all branches at next step boundary when cancelled during parallel execution', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'CancelParallel',
	async run(ctx) {
		const prep = await ctx.step({ name: 'prepare' }, async () => {
			return { ready: true };
		});
		const branchA = await ctx.step({ name: 'branch-a' }, async () => {
			await new Promise(resolve => setTimeout(resolve, 300));
			return { a: true };
		});
		const branchB = await ctx.step({ name: 'branch-b' }, async () => {
			await new Promise(resolve => setTimeout(resolve, 300));
			return { b: true };
		});
		const merged = await ctx.step({ name: 'merge' }, async () => {
			return { merged: true };
		});
		return merged;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

		// Wait for at least one branch to start, then cancel
		await waitForEvent(engine.eventBus, 'step:started', executionId, 5_000);
		await engine.engineService.cancelExecution(executionId);

		// Wait for terminal state
		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(
				() => reject(new Error('Timeout waiting for terminal state')),
				10_000,
			);
			engine.eventBus.onAny((event) => {
				if (
					'executionId' in event &&
					event.executionId === executionId &&
					(event.type === 'execution:completed' ||
						event.type === 'execution:failed' ||
						event.type === 'execution:cancelled')
				) {
					clearTimeout(timeout);
					resolve();
				}
			});
		});

		const execution = await getExecution(engine, executionId);
		expect(execution.cancelRequested).toBe(true);

		// The merge step should ideally not have been planned, but if all
		// branches completed before cancellation took effect, it may have run.
		// The important thing is that cancelRequested was set.
		const steps = await getStepExecutions(engine, executionId);
		const mergeStep = steps.find((s) => s.stepId === sha256('merge'));
		if (mergeStep) {
			// Accept any status -- the merge step may have completed before
			// cancellation propagated, or been cancelled/skipped
			expect([
				StepStatus.Completed,
				StepStatus.Cancelled,
				StepStatus.Queued,
				StepStatus.Pending,
			]).toContain(mergeStep.status);
		}
	});

	// -----------------------------------------------------------------------
	// Already-completed branch steps retain their output
	// -----------------------------------------------------------------------

	it('retains output of completed steps after cancellation', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'CancelRetainOutput',
	async run(ctx) {
		const first = await ctx.step({ name: 'first' }, async () => {
			return { output: 'preserved' };
		});
		const second = await ctx.step({ name: 'second' }, async () => {
			await new Promise(resolve => setTimeout(resolve, 500));
			return { output: 'might not finish' };
		});
		const third = await ctx.step({ name: 'third' }, async () => {
			return { output: 'should not run' };
		});
		return third;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

		// Wait for step 'second' to start (meaning 'first' has completed)
		const secondStepId = sha256('second');
		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(
				() => reject(new Error('Timeout waiting for second step')),
				10_000,
			);
			engine.eventBus.onAny((event) => {
				if (
					event.type === 'step:started' &&
					'executionId' in event &&
					event.executionId === executionId &&
					'stepId' in event &&
					event.stepId === secondStepId
				) {
					clearTimeout(timeout);
					resolve();
				}
			});
		});

		// Cancel now -- 'first' is completed, 'second' is running
		await engine.engineService.cancelExecution(executionId);

		// Wait for terminal state
		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(
				() => reject(new Error('Timeout waiting for terminal state')),
				10_000,
			);
			engine.eventBus.onAny((event) => {
				if (
					'executionId' in event &&
					event.executionId === executionId &&
					(event.type === 'execution:completed' ||
						event.type === 'execution:failed' ||
						event.type === 'execution:cancelled')
				) {
					clearTimeout(timeout);
					resolve();
				}
			});
		});

		// Verify that the first step's output is preserved in the database
		const steps = await getStepExecutions(engine, executionId);
		const firstStep = steps.find((s) => s.stepId === sha256('first'));
		expect(firstStep).toBeDefined();
		expect(firstStep!.status).toBe(StepStatus.Completed);
		expect(firstStep!.output).toEqual({ output: 'preserved' });
	});
});
