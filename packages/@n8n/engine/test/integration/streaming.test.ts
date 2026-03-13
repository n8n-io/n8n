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
	StepStatus,
} from './test-engine';
import type { TestEngine } from './test-engine';
import type { EngineEvent, StepChunkEvent } from '../../src/engine/event-bus.types';

function sha256(input: string): string {
	return createHash('sha256').update(input).digest('hex').substring(0, 12);
}

describe.skipIf(!process.env.DATABASE_URL)('Streaming', () => {
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
	// ctx.sendChunk() emits step:chunk event via broadcaster
	// -----------------------------------------------------------------------

	it('ctx.sendChunk() emits step:chunk event via event bus', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'StreamChunk',
	async run(ctx) {
		const result = await ctx.step({ name: 'streamer' }, async () => {
			await ctx.sendChunk({ token: 'hello' });
			return { final: 'output' };
		});
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

		const chunkReceived = new Promise<StepChunkEvent>((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error('Timeout waiting for step:chunk')), 10_000);
			engine.eventBus.onAny((event) => {
				if (
					event.type === 'step:chunk' &&
					'executionId' in event &&
					event.executionId === executionId
				) {
					clearTimeout(timeout);
					resolve(event as StepChunkEvent);
				}
			});
		});

		const chunk = await chunkReceived;
		expect(chunk.type).toBe('step:chunk');
		expect(chunk.executionId).toBe(executionId);
		expect(chunk.data).toEqual({ token: 'hello' });
		expect(chunk.timestamp).toBeDefined();
		expect(typeof chunk.timestamp).toBe('number');
	});

	// -----------------------------------------------------------------------
	// Multiple chunks delivered in order
	// -----------------------------------------------------------------------

	it('multiple chunks are delivered in order', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'StreamMultiple',
	async run(ctx) {
		const result = await ctx.step({ name: 'multi-chunk' }, async () => {
			await ctx.sendChunk({ index: 0, text: 'first' });
			await ctx.sendChunk({ index: 1, text: 'second' });
			await ctx.sendChunk({ index: 2, text: 'third' });
			return { total: 3 };
		});
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

		const chunks: StepChunkEvent[] = [];

		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error('Timeout waiting for chunks')), 10_000);

			engine.eventBus.onAny((event) => {
				if (
					event.type === 'step:chunk' &&
					'executionId' in event &&
					event.executionId === executionId
				) {
					chunks.push(event as StepChunkEvent);
					if (chunks.length === 3) {
						clearTimeout(timeout);
						resolve();
					}
				}
				// Also resolve if execution completes/fails before 3 chunks
				if (
					'executionId' in event &&
					event.executionId === executionId &&
					(event.type === 'execution:completed' || event.type === 'execution:failed')
				) {
					clearTimeout(timeout);
					resolve();
				}
			});
		});

		expect(chunks).toHaveLength(3);

		// Verify ordering: chunks should arrive in the order they were sent
		expect((chunks[0].data as { index: number }).index).toBe(0);
		expect((chunks[1].data as { index: number }).index).toBe(1);
		expect((chunks[2].data as { index: number }).index).toBe(2);

		// Verify timestamps are non-decreasing
		expect(chunks[0].timestamp).toBeLessThanOrEqual(chunks[1].timestamp);
		expect(chunks[1].timestamp).toBeLessThanOrEqual(chunks[2].timestamp);
	});

	// -----------------------------------------------------------------------
	// Chunks are NOT persisted to DB
	// -----------------------------------------------------------------------

	it('chunks are NOT persisted to DB', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'StreamNoPersist',
	async run(ctx) {
		const result = await ctx.step({ name: 'ephemeral' }, async () => {
			await ctx.sendChunk({ temp: 'data1' });
			await ctx.sendChunk({ temp: 'data2' });
			return { persisted: true };
		});
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');

		// Verify the step execution in DB has no chunk data in its output
		const steps = await getStepExecutions(engine, result.executionId);
		const ephemeralStep = steps.find((s) => s.stepId === sha256('ephemeral'));

		expect(ephemeralStep).toBeDefined();
		// The output should only contain the final return value, not chunks
		expect(ephemeralStep!.output).toEqual({ persisted: true });

		// Chunks are events -- they are not stored anywhere in the step
		// execution record. The output, input, and error fields should not
		// contain any chunk references.
		const outputStr = JSON.stringify(ephemeralStep!.output);
		expect(outputStr).not.toContain('data1');
		expect(outputStr).not.toContain('data2');
	});

	// -----------------------------------------------------------------------
	// Step output (final result) IS persisted to DB
	// -----------------------------------------------------------------------

	it('step output (final result) IS persisted to DB', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'StreamFinalPersisted',
	async run(ctx) {
		const result = await ctx.step({ name: 'with-chunks' }, async () => {
			await ctx.sendChunk({ partial: 'result' });
			return { finalAnswer: 42 };
		});
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');
		expect(result.result).toEqual({ finalAnswer: 42 });

		// Verify the step output is persisted
		const steps = await getStepExecutions(engine, result.executionId);
		const step = steps.find((s) => s.stepId === sha256('with-chunks'));
		expect(step).toBeDefined();
		expect(step!.output).toEqual({ finalAnswer: 42 });
		expect(step!.status).toBe(StepStatus.Completed);

		// Also verify execution result is persisted
		const execution = await getExecution(engine, result.executionId);
		expect(execution.result).toEqual({ finalAnswer: 42 });
	});

	// -----------------------------------------------------------------------
	// Step completion event includes final output, not chunks
	// -----------------------------------------------------------------------

	it('step completion event includes final output, not chunks', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'StreamCompletionEvent',
	async run(ctx) {
		const result = await ctx.step({ name: 'completer' }, async () => {
			await ctx.sendChunk({ chunk: 1 });
			await ctx.sendChunk({ chunk: 2 });
			return { complete: true };
		});
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

		const collectedEvents: EngineEvent[] = [];

		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error('Timeout')), 10_000);
			engine.eventBus.onAny((event) => {
				if ('executionId' in event && event.executionId === executionId) {
					collectedEvents.push(event);
					if (event.type === 'execution:completed' || event.type === 'execution:failed') {
						clearTimeout(timeout);
						resolve();
					}
				}
			});
		});

		// Find the step:completed event for our step
		const completedEvent = collectedEvents.find(
			(e) => e.type === 'step:completed' && 'stepId' in e && e.stepId === sha256('completer'),
		);

		expect(completedEvent).toBeDefined();
		expect(completedEvent!.type).toBe('step:completed');

		// The step:completed event should have the final output, not chunk data
		if (completedEvent!.type === 'step:completed') {
			expect((completedEvent as { output: unknown }).output).toEqual({
				complete: true,
			});
		}

		// Verify that chunk events were also emitted (separate from completion)
		const chunkEvents = collectedEvents.filter((e) => e.type === 'step:chunk');
		expect(chunkEvents.length).toBe(2);
	});

	// -----------------------------------------------------------------------
	// Streaming does not interfere with step execution
	// -----------------------------------------------------------------------

	it('streaming does not interfere with normal step execution flow', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'StreamNoInterference',
	async run(ctx) {
		const a = await ctx.step({ name: 'step-a' }, async () => {
			await ctx.sendChunk({ from: 'a', progress: 50 });
			await ctx.sendChunk({ from: 'a', progress: 100 });
			return { a: true };
		});
		const b = await ctx.step({ name: 'step-b' }, async () => {
			await ctx.sendChunk({ from: 'b', status: 'processing' });
			return { b: true, received: a.a };
		});
		return b;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');
		expect(result.result).toEqual({ b: true, received: true });

		// Both steps should have completed successfully
		const steps = await getStepExecutions(engine, result.executionId);
		const stepA = steps.find((s) => s.stepId === sha256('step-a'));
		const stepB = steps.find((s) => s.stepId === sha256('step-b'));

		expect(stepA).toBeDefined();
		expect(stepA!.status).toBe(StepStatus.Completed);
		expect(stepA!.output).toEqual({ a: true });

		expect(stepB).toBeDefined();
		expect(stepB!.status).toBe(StepStatus.Completed);
		expect(stepB!.output).toEqual({ b: true, received: true });
	});
});
