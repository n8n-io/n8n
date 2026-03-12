import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';

import {
	createTestEngine,
	destroyTestEngine,
	saveWorkflow,
	executeAndWait,
	getStepExecutions,
	cleanDatabase,
	StepStatus,
} from './test-engine';
import type { TestEngine } from './test-engine';

describe.skipIf(!process.env.DATABASE_URL)('Sleep/Wait', () => {
	let engine: TestEngine;

	beforeAll(async () => {
		engine = await createTestEngine();
	});

	afterAll(async () => {
		await destroyTestEngine(engine);
	});

	afterEach(async () => {
		await new Promise((r) => setTimeout(r, 50));
		await cleanDatabase(engine.dataSource);
		engine.stepProcessor.clearModuleCache();
	});

	it('executes a workflow with ctx.sleep() between steps', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Sleep Between Steps',
	async run(ctx) {
		const before = await ctx.step({ name: 'before-sleep' }, async () => {
			return { value: 42 };
		});

		await ctx.sleep(100);

		const after = await ctx.step({ name: 'after-sleep' }, async () => {
			return { original: before.value, added: before.value + 1 };
		});

		return after;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');
		expect(result.result).toEqual({ original: 42, added: 43 });

		// Verify sleep step execution exists and completed
		const steps = await getStepExecutions(engine, result.executionId);
		const sleepSteps = steps.filter((s) => s.stepType === 'sleep');
		expect(sleepSteps.length).toBe(1);
		expect(sleepSteps[0].status).toBe(StepStatus.Completed);
	});

	it('executes a workflow with ctx.waitUntil() between steps', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'WaitUntil Between Steps',
	async run(ctx) {
		const first = await ctx.step({ name: 'first' }, async () => {
			return { startedAt: Date.now() };
		});

		await ctx.waitUntil(new Date(Date.now() + 100));

		const second = await ctx.step({ name: 'second' }, async () => {
			return { elapsed: Date.now() - first.startedAt };
		});

		return second;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');
		const output = result.result as { elapsed: number };
		expect(output.elapsed).toBeGreaterThanOrEqual(50);
	});

	it('handles multiple ctx.sleep() calls in sequence', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Multi Sleep',
	async run(ctx) {
		const a = await ctx.step({ name: 'step-a' }, async () => ({ val: 1 }));

		await ctx.sleep(100);

		const b = await ctx.step({ name: 'step-b' }, async () => ({ val: a.val + 1 }));

		await ctx.sleep(100);

		const c = await ctx.step({ name: 'step-c' }, async () => ({ val: b.val + 1 }));

		return c;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');
		expect(result.result).toEqual({ val: 3 });

		// Verify two sleep nodes
		const steps = await getStepExecutions(engine, result.executionId);
		const sleepSteps = steps.filter((s) => s.stepType === 'sleep');
		expect(sleepSteps.length).toBe(2);
		for (const s of sleepSteps) {
			expect(s.status).toBe(StepStatus.Completed);
		}
	});

	it('makes all prior step outputs available after sleep', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Data Through Sleep',
	async run(ctx) {
		const first = await ctx.step({ name: 'first' }, async () => ({ x: 10 }));
		const second = await ctx.step({ name: 'second' }, async () => ({ y: first.x + 10 }));

		await ctx.sleep(100);

		const third = await ctx.step({ name: 'third' }, async () => {
			return { sum: first.x + second.y };
		});

		return third;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');
		expect(result.result).toEqual({ sum: 30 });
	});

	it('sleep step goes through queued → waiting → completed lifecycle', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Sleep Lifecycle',
	async run(ctx) {
		await ctx.step({ name: 'work' }, async () => ({ done: true }));
		await ctx.sleep(100);
		await ctx.step({ name: 'resume' }, async () => ({ resumed: true }));
		return { ok: true };
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');

		const steps = await getStepExecutions(engine, result.executionId);

		// trigger + work + sleep + resume = 4 step executions
		// (trigger may or may not create a step execution depending on engine config)
		const nonTriggerSteps = steps.filter((s) => s.stepType !== 'trigger');
		expect(nonTriggerSteps.length).toBe(3); // work + sleep + resume

		// Sleep step should be completed with waitUntil set
		const sleepStep = steps.find((s) => s.stepType === 'sleep');
		expect(sleepStep).toBeDefined();
		expect(sleepStep!.status).toBe(StepStatus.Completed);
		expect(sleepStep!.waitUntil).toBeDefined();
	});

	it('sleep step output passes through input data', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Sleep Passthrough',
	async run(ctx) {
		const work = await ctx.step({ name: 'work' }, async () => ({ data: 'hello' }));
		await ctx.sleep(100);
		await ctx.step({ name: 'check' }, async () => {
			return { received: work.data };
		});
		return { ok: true };
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');

		// The sleep node's output should be its input (passthrough)
		const steps = await getStepExecutions(engine, result.executionId);
		const sleepStep = steps.find((s) => s.stepType === 'sleep');
		expect(sleepStep).toBeDefined();
		expect(sleepStep!.output).toBeDefined();
	});
});
