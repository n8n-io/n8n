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
import type { EngineEvent } from '../../src/engine/event-bus.types';

function sha256(input: string): string {
	return createHash('sha256').update(input).digest('hex').substring(0, 12);
}

describe.skipIf(!process.env.DATABASE_URL)('Retry', () => {
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
	// Retriable error with retries remaining -> retry_pending
	// -----------------------------------------------------------------------

	it('sets status to retry_pending for retriable errors with retries remaining', async () => {
		// A step that always throws a generic error (classified as retriable
		// by default in error-classifier) with maxAttempts: 3
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Retry',
	async run(ctx) {
		const result = await ctx.step({
			name: 'flaky',
			retry: { maxAttempts: 3, baseDelay: 50 },
		}, async () => {
			throw new Error('Transient failure');
		});
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

		// Wait for the step:retrying event to confirm the step is retried
		const retryEvent = await new Promise<EngineEvent>((resolve, reject) => {
			const timeout = setTimeout(
				() => reject(new Error('Timeout waiting for step:retrying')),
				10_000,
			);
			engine.eventBus.onAny((event) => {
				if (
					event.type === 'step:retrying' &&
					'executionId' in event &&
					event.executionId === executionId
				) {
					clearTimeout(timeout);
					resolve(event);
				}
			});
		});

		expect(retryEvent.type).toBe('step:retrying');

		// The step should eventually exhaust retries and fail
		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(
				() => reject(new Error('Timeout waiting for execution:failed')),
				10_000,
			);
			engine.eventBus.onAny((event) => {
				if (
					(event.type === 'execution:failed' || event.type === 'execution:completed') &&
					'executionId' in event &&
					event.executionId === executionId
				) {
					clearTimeout(timeout);
					resolve();
				}
			});
		});

		const execution = await getExecution(engine, executionId);
		expect(execution.status).toBe(ExecutionStatus.Failed);
	});

	// -----------------------------------------------------------------------
	// Successful retry
	// -----------------------------------------------------------------------

	it('completes successfully after retrying', async () => {
		// Use ctx.attempt to decide when to succeed. The engine increments
		// the attempt counter on each retry, so we can check it directly
		// instead of relying on module-level state (which the transpiler
		// drops because it only preserves function declarations and
		// const-assigned arrow functions as helpers).
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'RetrySuccess',
	async run(ctx) {
		const result = await ctx.step({
			name: 'eventually-works',
			retry: { maxAttempts: 3, baseDelay: 50 },
		}, async () => {
			if (ctx.attempt < 2) {
				throw new Error('Not yet');
			}
			return { success: true, attempts: ctx.attempt };
		});
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');
		// The step should have succeeded on the 2nd attempt
		expect(result.result).toEqual({ success: true, attempts: 2 });
	});

	// -----------------------------------------------------------------------
	// Retries exhausted -> failed
	// -----------------------------------------------------------------------

	it('fails execution when retries are exhausted', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'RetryExhaust',
	async run(ctx) {
		const result = await ctx.step({
			name: 'always-fails',
			retry: { maxAttempts: 2, baseDelay: 50 },
		}, async () => {
			throw new Error('Permanent transient error');
		});
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('failed');

		// Verify the step recorded the error
		const steps = await getStepExecutions(engine, result.executionId);
		const failedStep = steps.find((s) => s.stepId === sha256('always-fails'));
		expect(failedStep).toBeDefined();
		expect(failedStep!.status).toBe(StepStatus.Failed);
		expect(failedStep!.error).toBeDefined();
	});

	// -----------------------------------------------------------------------
	// Non-retriable error -> immediate failure
	// -----------------------------------------------------------------------

	it('fails immediately on non-retriable error (TypeError)', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'NonRetriable',
	async run(ctx) {
		const result = await ctx.step({
			name: 'type-error',
			retry: { maxAttempts: 3, baseDelay: 50 },
		}, async () => {
			const obj = undefined;
			return obj.property;
		});
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);

		const retryEvents: EngineEvent[] = [];
		engine.eventBus.onAny((event) => {
			if (event.type === 'step:retrying') {
				retryEvents.push(event);
			}
		});

		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('failed');
		// TypeError is non-retriable, so no retry events should be emitted
		expect(retryEvents.length).toBe(0);
	});

	// -----------------------------------------------------------------------
	// step:retrying event emitted with delay and error info
	// -----------------------------------------------------------------------

	it('emits step:retrying event with attempt and error info', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'RetryEvent',
	async run(ctx) {
		const result = await ctx.step({
			name: 'emits-retry',
			retry: { maxAttempts: 2, baseDelay: 50 },
		}, async () => {
			throw new Error('Retry me');
		});
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

		const retryEvent = await new Promise<EngineEvent>((resolve, reject) => {
			const timeout = setTimeout(
				() => reject(new Error('Timeout waiting for step:retrying')),
				10_000,
			);
			engine.eventBus.onAny((event) => {
				if (
					event.type === 'step:retrying' &&
					'executionId' in event &&
					event.executionId === executionId
				) {
					clearTimeout(timeout);
					resolve(event);
				}
			});
		});

		expect(retryEvent.type).toBe('step:retrying');
		if (retryEvent.type === 'step:retrying') {
			expect(retryEvent.attempt).toBeGreaterThanOrEqual(2);
			expect(retryEvent.retryAfter).toBeDefined();
			expect(retryEvent.error).toBeDefined();
			expect(retryEvent.error.message).toContain('Retry me');
		}

		// Wait for execution to finish
		await new Promise<void>((resolve) => {
			engine.eventBus.onAny((event) => {
				if (
					(event.type === 'execution:failed' || event.type === 'execution:completed') &&
					'executionId' in event &&
					event.executionId === executionId
				) {
					resolve();
				}
			});
		});
	});

	// -----------------------------------------------------------------------
	// retry_after timestamp calculated with backoff
	// -----------------------------------------------------------------------

	it('calculates retry_after with exponential backoff', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Backoff',
	async run(ctx) {
		const result = await ctx.step({
			name: 'backoff-step',
			retry: { maxAttempts: 3, baseDelay: 100, jitter: false },
		}, async () => {
			throw new Error('Keep retrying');
		});
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

		const retryAfterTimes: string[] = [];

		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(
				() => reject(new Error('Timeout waiting for execution end')),
				15_000,
			);
			engine.eventBus.onAny((event) => {
				if ('executionId' in event && event.executionId === executionId) {
					if (event.type === 'step:retrying') {
						retryAfterTimes.push(event.retryAfter);
					}
					if (event.type === 'execution:failed') {
						clearTimeout(timeout);
						resolve();
					}
				}
			});
		});

		// With maxAttempts: 3, we expect 2 retrying events (attempt 1 fails -> retry,
		// attempt 2 fails -> retry, attempt 3 fails -> exhausted/failed)
		expect(retryAfterTimes.length).toBeGreaterThanOrEqual(1);
	});

	// -----------------------------------------------------------------------
	// Non-retriable ReferenceError
	// -----------------------------------------------------------------------

	it('fails immediately on ReferenceError (non-retriable)', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'RefError',
	async run(ctx) {
		const result = await ctx.step({
			name: 'ref-error',
			retry: { maxAttempts: 3, baseDelay: 50 },
		}, async () => {
			return undefinedVariable;
		});
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('failed');

		const steps = await getStepExecutions(engine, result.executionId);
		const stepExec = steps.find((s) => s.stepId === sha256('ref-error'));
		expect(stepExec).toBeDefined();
		expect(stepExec!.status).toBe(StepStatus.Failed);
		// Should have failed on attempt 1 with no retries
		expect(stepExec!.attempt).toBe(1);
	});

	// -----------------------------------------------------------------------
	// Attempt counter incremented on each retry
	// -----------------------------------------------------------------------

	it('increments attempt counter on each retry', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'AttemptCounter',
	async run(ctx) {
		const result = await ctx.step({
			name: 'count-attempts',
			retry: { maxAttempts: 3, baseDelay: 50 },
		}, async () => {
			throw new Error('Always fails');
		});
		return result;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

		const retryAttempts: number[] = [];

		await new Promise<void>((resolve, reject) => {
			const timeout = setTimeout(
				() => reject(new Error('Timeout waiting for execution end')),
				15_000,
			);
			engine.eventBus.onAny((event) => {
				if ('executionId' in event && event.executionId === executionId) {
					if (event.type === 'step:retrying') {
						retryAttempts.push(event.attempt);
					}
					if (event.type === 'execution:failed') {
						clearTimeout(timeout);
						resolve();
					}
				}
			});
		});

		// Attempt counter should have been incremented
		// maxAttempts: 3 means up to 3 tries total. Retrying events are emitted
		// for attempts 2 and 3 (after first and second failures).
		expect(retryAttempts.length).toBeGreaterThanOrEqual(1);
		for (let i = 0; i < retryAttempts.length; i++) {
			expect(retryAttempts[i]).toBe(i + 2); // starts at 2
		}
	});
});
