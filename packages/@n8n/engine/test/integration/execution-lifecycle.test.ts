import { createHash } from 'node:crypto';

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';

import {
	createTestEngine,
	destroyTestEngine,
	saveWorkflow,
	saveWorkflowVersion,
	executeAndWait,
	getExecution,
	getStepExecutions,
	cleanDatabase,
	ExecutionStatus,
	StepStatus,
} from './test-engine';
import type { TestEngine } from './test-engine';

function sha256(input: string): string {
	return createHash('sha256').update(input).digest('hex').substring(0, 12);
}

describe.skipIf(!process.env.DATABASE_URL)('Execution Lifecycle', () => {
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
	// Simple 2-step workflow
	// -----------------------------------------------------------------------

	it('executes a simple 2-step workflow end-to-end', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Hello',
	async run(ctx) {
		const greeting = await ctx.step({ name: 'greet' }, async () => {
			return { message: 'Hello from Engine v2!' };
		});
		const result = await ctx.step({ name: 'format' }, async () => {
			return { formatted: greeting.message + ' Done.' };
		});
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');
		expect(result.result).toEqual({ formatted: 'Hello from Engine v2! Done.' });
	});

	// -----------------------------------------------------------------------
	// 10-step pipeline
	// -----------------------------------------------------------------------

	it('executes a 10-step pipeline to completion', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Pipeline',
	async run(ctx) {
		const s1 = await ctx.step({ name: 'step-1' }, async () => ({ val: 1 }));
		const s2 = await ctx.step({ name: 'step-2' }, async () => ({ val: s1.val + 1 }));
		const s3 = await ctx.step({ name: 'step-3' }, async () => ({ val: s2.val + 1 }));
		const s4 = await ctx.step({ name: 'step-4' }, async () => ({ val: s3.val + 1 }));
		const s5 = await ctx.step({ name: 'step-5' }, async () => ({ val: s4.val + 1 }));
		const s6 = await ctx.step({ name: 'step-6' }, async () => ({ val: s5.val + 1 }));
		const s7 = await ctx.step({ name: 'step-7' }, async () => ({ val: s6.val + 1 }));
		const s8 = await ctx.step({ name: 'step-8' }, async () => ({ val: s7.val + 1 }));
		const s9 = await ctx.step({ name: 'step-9' }, async () => ({ val: s8.val + 1 }));
		const s10 = await ctx.step({ name: 'step-10' }, async () => ({ val: s9.val + 1 }));
		return s10;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');
		expect(result.result).toEqual({ val: 10 });

		// Verify all 10 steps + trigger were materialized
		const steps = await getStepExecutions(engine, result.executionId);
		// trigger + 10 steps = 11 step execution records
		expect(steps.length).toBe(11);
		const completedSteps = steps.filter((s) => s.status === StepStatus.Completed);
		expect(completedSteps.length).toBe(11);
	});

	// -----------------------------------------------------------------------
	// Trigger step materialization
	// -----------------------------------------------------------------------

	it('materializes trigger step with trigger data as output', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'TriggerData',
	async run(ctx) {
		const result = await ctx.step({ name: 'use-trigger' }, async () => {
			return { received: true };
		});
		return result;
	},
});
`;

		const triggerData = { webhook: { body: { name: 'test' } } };
		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId, triggerData);

		expect(result.status).toBe('completed');

		// Verify the trigger step has the trigger data as output
		const steps = await getStepExecutions(engine, result.executionId);
		const triggerStep = steps.find((s) => s.stepId === 'trigger');
		expect(triggerStep).toBeDefined();
		expect(triggerStep!.status).toBe(StepStatus.Completed);
		expect(triggerStep!.output).toEqual(triggerData);
	});

	// -----------------------------------------------------------------------
	// Execution events
	// -----------------------------------------------------------------------

	it('emits execution:started and execution:completed events', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Events',
	async run(ctx) {
		const result = await ctx.step({ name: 'simple' }, async () => ({ done: true }));
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);

		// Subscribe to ALL events BEFORE starting execution so we don't miss
		// execution:started which is emitted synchronously at the end of startExecution.
		const collectedEvents: Array<{ type: string; executionId?: string }> = [];
		const donePromise = new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error('Timeout')), 10_000);
			engine.eventBus.onAny((event) => {
				if ('executionId' in event) {
					collectedEvents.push({ type: event.type, executionId: event.executionId as string });
					if (event.type === 'execution:completed' || event.type === 'execution:failed') {
						clearTimeout(timeout);
						resolve();
					}
				}
			});
		});

		const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

		await donePromise;

		// Filter to only events for this execution
		const relevantEvents = collectedEvents.filter((e) => e.executionId === executionId);

		const eventTypes = relevantEvents.map((e) => e.type);
		expect(eventTypes).toContain('execution:started');
		expect(eventTypes).toContain('execution:completed');
	});

	// -----------------------------------------------------------------------
	// step:started event
	// -----------------------------------------------------------------------

	it('emits step:started event before step function executes', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'StepStarted',
	async run(ctx) {
		const result = await ctx.step({ name: 'my-step' }, async () => ({ ok: true }));
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

		const collectedEvents: Array<{ type: string; stepId?: string }> = [];
		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error('Timeout')), 10_000);
			engine.eventBus.onAny((event) => {
				if ('executionId' in event && event.executionId === executionId) {
					collectedEvents.push({
						type: event.type,
						stepId: 'stepId' in event ? (event.stepId as string) : undefined,
					});
					if (event.type === 'execution:completed' || event.type === 'execution:failed') {
						clearTimeout(timeout);
						resolve();
					}
				}
			});
		});

		const stepStartedEvents = collectedEvents.filter((e) => e.type === 'step:started');
		expect(stepStartedEvents.length).toBeGreaterThan(0);

		// step:started should come before step:completed for the same step
		const myStepId = sha256('my-step');
		const startedIdx = collectedEvents.findIndex(
			(e) => e.type === 'step:started' && e.stepId === myStepId,
		);
		const completedIdx = collectedEvents.findIndex(
			(e) => e.type === 'step:completed' && e.stepId === myStepId,
		);
		expect(startedIdx).toBeLessThan(completedIdx);
	});

	// -----------------------------------------------------------------------
	// Version pinning
	// -----------------------------------------------------------------------

	it('pins workflow version at execution creation time', async () => {
		// Create workflow v1 that returns { version: 1 }
		const sourceV1 = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Versioned',
	async run(ctx) {
		const result = await ctx.step({ name: 'check' }, async () => ({ version: 1 }));
		return result;
	},
});
`;
		const workflowId = await saveWorkflow(engine, sourceV1);

		// Start execution (uses v1)
		const result1 = await executeAndWait(engine, workflowId);
		expect(result1.status).toBe('completed');
		expect(result1.result).toEqual({ version: 1 });

		// Verify execution record has workflowVersion = 1
		const execution = await getExecution(engine, result1.executionId);
		expect(execution.workflowVersion).toBe(1);

		// Save v2 that returns { version: 2 }
		const sourceV2 = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Versioned',
	async run(ctx) {
		const result = await ctx.step({ name: 'check' }, async () => ({ version: 2 }));
		return result;
	},
});
`;
		const newVersion = await saveWorkflowVersion(engine, workflowId, sourceV2);
		expect(newVersion).toBe(2);

		// Start a new execution -- it should use v2
		engine.stepProcessor.clearModuleCache();
		const result2 = await executeAndWait(engine, workflowId);
		expect(result2.status).toBe('completed');
		expect(result2.result).toEqual({ version: 2 });

		// Verify the second execution pinned to v2
		const execution2 = await getExecution(engine, result2.executionId);
		expect(execution2.workflowVersion).toBe(2);
	});

	// -----------------------------------------------------------------------
	// Execution with null trigger data
	// -----------------------------------------------------------------------

	it('handles execution with no trigger data', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'NoTrigger',
	async run(ctx) {
		const result = await ctx.step({ name: 'noop' }, async () => ({ ran: true }));
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');
		expect(result.result).toEqual({ ran: true });
	});

	// -----------------------------------------------------------------------
	// Execution record metrics
	// -----------------------------------------------------------------------

	it('records execution metrics (durationMs, computeMs)', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Metrics',
	async run(ctx) {
		const result = await ctx.step({ name: 'wait-a-bit' }, async () => {
			return { done: true };
		});
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');

		const execution = await getExecution(engine, result.executionId);
		expect(execution.status).toBe(ExecutionStatus.Completed);
		expect(execution.durationMs).toBeGreaterThanOrEqual(0);
		expect(execution.computeMs).toBeGreaterThanOrEqual(0);
		expect(execution.completedAt).toBeDefined();
		expect(execution.startedAt).toBeDefined();
	});

	// -----------------------------------------------------------------------
	// Step execution input contains predecessor output
	// -----------------------------------------------------------------------

	it('passes predecessor output as step input', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'DataFlow',
	async run(ctx) {
		const first = await ctx.step({ name: 'produce' }, async () => {
			return { data: [1, 2, 3] };
		});
		const second = await ctx.step({ name: 'consume' }, async () => {
			return { sum: first.data.reduce((a, b) => a + b, 0) };
		});
		return second;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');
		expect(result.result).toEqual({ sum: 6 });

		// Verify step inputs/outputs in the database
		const steps = await getStepExecutions(engine, result.executionId);
		const produceStep = steps.find((s) => s.stepId === sha256('produce'));
		const consumeStep = steps.find((s) => s.stepId === sha256('consume'));

		expect(produceStep).toBeDefined();
		expect(produceStep!.output).toEqual({ data: [1, 2, 3] });

		expect(consumeStep).toBeDefined();
		// The consume step's input should contain produce's output keyed by produce's step ID
		const consumeInput = consumeStep!.input as Record<string, unknown>;
		expect(consumeInput[sha256('produce')]).toEqual({ data: [1, 2, 3] });
	});
});
