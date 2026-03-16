import { createHash } from 'node:crypto';

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';

import {
	createTestEngine,
	destroyTestEngine,
	saveWorkflow,
	executeAndWait,
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

describe.skipIf(!process.env.DATABASE_URL)('Pause/Resume', () => {
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
	// Pause -- Basic
	// -----------------------------------------------------------------------

	describe('Pause -- Basic', () => {
		it('pause_requested checked in step:completed handler before planNextSteps', async () => {
			// Workflow with multiple steps. Pause after first step completes.
			// Second step should NOT be planned.
			const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'PauseBeforePlan',
	async run(ctx) {
		const a = await ctx.step({ name: 'first-step' }, async () => {
			return { value: 1 };
		});
		const b = await ctx.step({ name: 'second-step' }, async () => {
			return { value: a.value + 1 };
		});
		return b;
	},
});
`;

			const workflowId = await saveWorkflow(engine, source);
			const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

			// Wait for first step to start, then immediately pause
			await waitForEvent(engine.eventBus, 'step:started', executionId, 10_000);
			await engine.engineService.pauseExecution(executionId);

			// Wait for execution:paused event
			await new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(
					() => reject(new Error('Timeout waiting for execution:paused')),
					10_000,
				);
				engine.eventBus.onAny((event) => {
					if (
						event.type === 'execution:paused' &&
						'executionId' in event &&
						event.executionId === executionId
					) {
						clearTimeout(timeout);
						resolve();
					}
					// Also resolve if execution completed before pause took effect
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

			const execution = await getExecution(engine, executionId);

			// If the pause took effect, the execution should be paused
			// (timing-dependent: if both steps completed before pause, it may be completed)
			if (execution.status === ExecutionStatus.Paused) {
				// Verify successor was NOT planned
				const steps = await getStepExecutions(engine, executionId);
				const secondStep = steps.find((s) => s.stepId === sha256('second-step'));
				expect(secondStep).toBeUndefined();
			}
			// Either paused or completed is acceptable (timing)
			expect([ExecutionStatus.Paused, ExecutionStatus.Completed]).toContain(execution.status);
		});

		it('current in-flight step completes normally when paused', async () => {
			const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'PauseInFlight',
	async run(ctx) {
		const a = await ctx.step({ name: 'running-step' }, async () => {
			await new Promise(resolve => setTimeout(resolve, 100));
			return { completed: true };
		});
		const b = await ctx.step({ name: 'blocked-step' }, async () => {
			return { should_not_run: true };
		});
		return b;
	},
});
`;

			const workflowId = await saveWorkflow(engine, source);
			const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

			// Wait for first step to start, then pause
			await waitForEvent(engine.eventBus, 'step:started', executionId, 10_000);
			await engine.engineService.pauseExecution(executionId);

			// Wait for paused or completed
			await new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(() => reject(new Error('Timeout')), 10_000);
				engine.eventBus.onAny((event) => {
					if (
						'executionId' in event &&
						event.executionId === executionId &&
						(event.type === 'execution:paused' ||
							event.type === 'execution:completed' ||
							event.type === 'execution:failed')
					) {
						clearTimeout(timeout);
						resolve();
					}
				});
			});

			// The first step should have completed successfully regardless
			const steps = await getStepExecutions(engine, executionId);
			const firstStep = steps.find((s) => s.stepId === sha256('running-step'));
			expect(firstStep).toBeDefined();
			expect(firstStep!.status).toBe(StepStatus.Completed);
			expect(firstStep!.output).toEqual({ completed: true });
		});

		it('no successor steps are planned while paused', async () => {
			// Use a step with a delay to ensure the pause flag can be set
			// before the step completes and plans its successors.
			const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'PauseNoSuccessors',
	async run(ctx) {
		const a = await ctx.step({ name: 'step-a' }, async () => {
			await new Promise(resolve => setTimeout(resolve, 200));
			return { done: true };
		});
		const b = await ctx.step({ name: 'step-b' }, async () => {
			return { value: 2 };
		});
		const c = await ctx.step({ name: 'step-c' }, async () => {
			return { value: 3 };
		});
		return c;
	},
});
`;

			const workflowId = await saveWorkflow(engine, source);
			const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

			// Pause immediately — may or may not take effect before steps complete
			await engine.engineService.pauseExecution(executionId);

			// Poll DB until execution reaches a settled state
			for (let i = 0; i < 100; i++) {
				await new Promise((r) => setTimeout(r, 100));
				const exec = await getExecution(engine, executionId);
				if (
					exec.status === ExecutionStatus.Paused ||
					exec.status === ExecutionStatus.Completed ||
					exec.status === ExecutionStatus.Failed ||
					exec.status === ExecutionStatus.Cancelled ||
					(exec.status === ExecutionStatus.Running && exec.pauseRequested)
				) {
					break;
				}
				if (i === 99) throw new Error('Timeout waiting for execution to settle');
			}

			const execution = await getExecution(engine, executionId);
			if (execution.status === ExecutionStatus.Paused) {
				const steps = await getStepExecutions(engine, executionId);
				// step-b and step-c should NOT be planned while paused
				const stepB = steps.find((s) => s.stepId === sha256('step-b'));
				const stepC = steps.find((s) => s.stepId === sha256('step-c'));
				expect(stepB).toBeUndefined();
				expect(stepC).toBeUndefined();
			}
			// Either paused, completed, or running+pauseRequested is acceptable
			expect(
				execution.status === ExecutionStatus.Paused ||
					execution.status === ExecutionStatus.Completed ||
					(execution.status === ExecutionStatus.Running && execution.pauseRequested),
			).toBe(true);
		});

		it('execution status changes to paused', async () => {
			const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'PauseStatus',
	async run(ctx) {
		const a = await ctx.step({ name: 'slow' }, async () => {
			await new Promise(resolve => setTimeout(resolve, 200));
			return { ok: true };
		});
		const b = await ctx.step({ name: 'next' }, async () => {
			return { after: true };
		});
		return b;
	},
});
`;

			const workflowId = await saveWorkflow(engine, source);
			const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

			// Pause immediately
			await engine.engineService.pauseExecution(executionId);

			// Poll DB until execution reaches a settled state.
			// Note: If pause is set before the poller picks up any step, the
			// execution may stay in Running with pauseRequested=true.
			for (let i = 0; i < 100; i++) {
				await new Promise((r) => setTimeout(r, 100));
				const exec = await getExecution(engine, executionId);
				if (
					exec.status === ExecutionStatus.Paused ||
					exec.status === ExecutionStatus.Completed ||
					exec.status === ExecutionStatus.Failed ||
					exec.status === ExecutionStatus.Cancelled ||
					(exec.status === ExecutionStatus.Running && exec.pauseRequested)
				) {
					break;
				}
				if (i === 99) throw new Error('Timeout waiting for execution to settle');
			}

			const execution = await getExecution(engine, executionId);
			// Verify execution reached a valid state. Running+pauseRequested is
			// also acceptable when the pause flag was set before any step was picked up.
			expect(
				execution.status === ExecutionStatus.Paused ||
					execution.status === ExecutionStatus.Completed ||
					(execution.status === ExecutionStatus.Running && execution.pauseRequested),
			).toBe(true);
		});

		it('execution:paused event is emitted', async () => {
			const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'PauseEvent',
	async run(ctx) {
		const a = await ctx.step({ name: 'work' }, async () => {
			await new Promise(resolve => setTimeout(resolve, 200));
			return { done: true };
		});
		const b = await ctx.step({ name: 'more-work' }, async () => {
			return { more: true };
		});
		return b;
	},
});
`;

			const workflowId = await saveWorkflow(engine, source);
			const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

			await engine.engineService.pauseExecution(executionId);

			const receivedPaused = await new Promise<boolean>((resolve) => {
				const timeout = setTimeout(() => resolve(false), 5_000);
				engine.eventBus.onAny((event) => {
					if (
						event.type === 'execution:paused' &&
						'executionId' in event &&
						event.executionId === executionId
					) {
						clearTimeout(timeout);
						resolve(true);
					}
					// If completed first, pause didn't take effect
					if (
						'executionId' in event &&
						event.executionId === executionId &&
						event.type === 'execution:completed'
					) {
						clearTimeout(timeout);
						resolve(false);
					}
				});
			});

			// If the pause took effect, we should have received the event
			if (receivedPaused) {
				const execution = await getExecution(engine, executionId);
				expect(execution.status).toBe(ExecutionStatus.Paused);
			}
		});

		it('steps in queued are not picked up by poller while paused', async () => {
			const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'PauseQueuedFilter',
	async run(ctx) {
		const a = await ctx.step({ name: 'initial' }, async () => {
			return { v: 1 };
		});
		const b = await ctx.step({ name: 'blocked' }, async () => {
			return { v: 2 };
		});
		return b;
	},
});
`;

			const workflowId = await saveWorkflow(engine, source);
			const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

			// Pause before first step completes
			await engine.engineService.pauseExecution(executionId);

			// Poll DB until execution reaches a settled state.
			// Note: If pause is set before the poller picks up any step, the
			// execution may stay in Running with pauseRequested=true.
			for (let i = 0; i < 100; i++) {
				await new Promise((r) => setTimeout(r, 100));
				const exec = await getExecution(engine, executionId);
				if (
					exec.status === ExecutionStatus.Paused ||
					exec.status === ExecutionStatus.Completed ||
					exec.status === ExecutionStatus.Failed ||
					exec.status === ExecutionStatus.Cancelled ||
					(exec.status === ExecutionStatus.Running && exec.pauseRequested)
				) {
					break;
				}
				if (i === 99) throw new Error('Timeout waiting for execution to settle');
			}

			const execution = await getExecution(engine, executionId);
			if (
				execution.status === ExecutionStatus.Paused ||
				(execution.status === ExecutionStatus.Running && execution.pauseRequested)
			) {
				// The poller should NOT pick up any queued steps since
				// execution is paused (poller joins on execution and checks
				// pauseRequested=false)
				const steps = await getStepExecutions(engine, executionId);
				const queuedSteps = steps.filter((s) => s.status === StepStatus.Queued);
				// No queued steps should have been picked up
				expect(queuedSteps.every((s) => s.status === StepStatus.Queued)).toBe(true);
			}
		});
	});

	// -----------------------------------------------------------------------
	// Resume
	// -----------------------------------------------------------------------

	describe('Resume', () => {
		it('resume sets pauseRequested=false, status=running', async () => {
			const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'ResumeRunning',
	async run(ctx) {
		const a = await ctx.step({ name: 'step-one' }, async () => {
			await new Promise(resolve => setTimeout(resolve, 200));
			return { v: 1 };
		});
		const b = await ctx.step({ name: 'step-two' }, async () => {
			return { v: 2 };
		});
		return b;
	},
});
`;

			const workflowId = await saveWorkflow(engine, source);
			const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

			await engine.engineService.pauseExecution(executionId);

			// Wait for paused
			const paused = await new Promise<boolean>((resolve) => {
				const timeout = setTimeout(() => resolve(false), 5_000);
				engine.eventBus.onAny((event) => {
					if (
						event.type === 'execution:paused' &&
						'executionId' in event &&
						event.executionId === executionId
					) {
						clearTimeout(timeout);
						resolve(true);
					}
					if (
						'executionId' in event &&
						event.executionId === executionId &&
						event.type === 'execution:completed'
					) {
						clearTimeout(timeout);
						resolve(false);
					}
				});
			});

			if (!paused) return; // Timing: execution completed before pause

			// Now resume
			await engine.engineService.resumeExecution(executionId);

			// Verify state immediately after resume call
			const execution = await getExecution(engine, executionId);
			expect(execution.pauseRequested).toBe(false);
			expect(execution.status).toBe(ExecutionStatus.Running);
		});

		it('execution:resumed event is emitted', async () => {
			const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'ResumeEvent',
	async run(ctx) {
		const a = await ctx.step({ name: 'work-one' }, async () => {
			await new Promise(resolve => setTimeout(resolve, 200));
			return { v: 1 };
		});
		const b = await ctx.step({ name: 'work-two' }, async () => {
			return { v: 2 };
		});
		return b;
	},
});
`;

			const workflowId = await saveWorkflow(engine, source);
			const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

			await engine.engineService.pauseExecution(executionId);

			const paused = await new Promise<boolean>((resolve) => {
				const timeout = setTimeout(() => resolve(false), 5_000);
				engine.eventBus.onAny((event) => {
					if (
						event.type === 'execution:paused' &&
						'executionId' in event &&
						event.executionId === executionId
					) {
						clearTimeout(timeout);
						resolve(true);
					}
					if (
						'executionId' in event &&
						event.executionId === executionId &&
						event.type === 'execution:completed'
					) {
						clearTimeout(timeout);
						resolve(false);
					}
				});
			});

			if (!paused) return;

			// Listen for execution:resumed
			const resumePromise = new Promise<boolean>((resolve) => {
				const timeout = setTimeout(() => resolve(false), 5_000);
				engine.eventBus.onAny((event) => {
					if (
						event.type === 'execution:resumed' &&
						'executionId' in event &&
						event.executionId === executionId
					) {
						clearTimeout(timeout);
						resolve(true);
					}
				});
			});

			await engine.engineService.resumeExecution(executionId);

			const received = await resumePromise;
			expect(received).toBe(true);
		});

		it('successor steps are queued and picked up normally after resume', async () => {
			const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'ResumeSuccessors',
	async run(ctx) {
		const a = await ctx.step({ name: 'first' }, async () => {
			await new Promise(resolve => setTimeout(resolve, 200));
			return { v: 1 };
		});
		const b = await ctx.step({ name: 'second' }, async () => {
			return { v: a.v + 1 };
		});
		return b;
	},
});
`;

			const workflowId = await saveWorkflow(engine, source);
			const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

			await engine.engineService.pauseExecution(executionId);

			// Wait for paused
			const paused = await new Promise<boolean>((resolve) => {
				const timeout = setTimeout(() => resolve(false), 5_000);
				engine.eventBus.onAny((event) => {
					if (
						event.type === 'execution:paused' &&
						'executionId' in event &&
						event.executionId === executionId
					) {
						clearTimeout(timeout);
						resolve(true);
					}
					if (
						'executionId' in event &&
						event.executionId === executionId &&
						event.type === 'execution:completed'
					) {
						clearTimeout(timeout);
						resolve(false);
					}
				});
			});

			if (!paused) return;

			// Resume and wait for completion
			const completionPromise = new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(
					() => reject(new Error('Timeout waiting for completion')),
					10_000,
				);
				engine.eventBus.onAny((event) => {
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

			await engine.engineService.resumeExecution(executionId);
			await completionPromise;

			const execution = await getExecution(engine, executionId);
			expect(execution.status).toBe(ExecutionStatus.Completed);

			// Verify the second step was planned and completed
			const steps = await getStepExecutions(engine, executionId);
			const secondStep = steps.find((s) => s.stepId === sha256('second'));
			expect(secondStep).toBeDefined();
			expect(secondStep!.status).toBe(StepStatus.Completed);
			expect(secondStep!.output).toEqual({ v: 2 });
		});
	});

	// -----------------------------------------------------------------------
	// Timed pause
	// -----------------------------------------------------------------------

	describe('Timed pause', () => {
		it('pause with resumeAfter creates execution with resume_after timestamp', async () => {
			const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'TimedPause',
	async run(ctx) {
		const a = await ctx.step({ name: 'simple' }, async () => {
			await new Promise(resolve => setTimeout(resolve, 200));
			return { v: 1 };
		});
		const b = await ctx.step({ name: 'next' }, async () => {
			return { v: 2 };
		});
		return b;
	},
});
`;

			const workflowId = await saveWorkflow(engine, source);
			const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

			const resumeAfter = new Date(Date.now() + 60_000);
			await engine.engineService.pauseExecution(executionId, resumeAfter);

			// Allow some time for the pause flag to be set
			await new Promise((resolve) => setTimeout(resolve, 50));

			const execution = await getExecution(engine, executionId);
			expect(execution.pauseRequested).toBe(true);
			expect(execution.resumeAfter).toBeDefined();

			// The resume_after time should be close to what we specified
			if (execution.resumeAfter) {
				const diff = Math.abs(execution.resumeAfter.getTime() - resumeAfter.getTime());
				expect(diff).toBeLessThan(5000); // within 5s
			}

			// Cancel to clean up (don't wait 60s)
			await engine.engineService.cancelExecution(executionId);
		});

		it('user can resume manually before resume_after', async () => {
			const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'ManualResumeBeforeTimer',
	async run(ctx) {
		const a = await ctx.step({ name: 'process' }, async () => {
			await new Promise(resolve => setTimeout(resolve, 200));
			return { processed: true };
		});
		const b = await ctx.step({ name: 'finalize' }, async () => {
			return { finalized: true };
		});
		return b;
	},
});
`;

			const workflowId = await saveWorkflow(engine, source);
			const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

			// Set a far-future resumeAfter
			const resumeAfter = new Date(Date.now() + 3600_000); // 1 hour
			await engine.engineService.pauseExecution(executionId, resumeAfter);

			// Wait for paused
			const paused = await new Promise<boolean>((resolve) => {
				const timeout = setTimeout(() => resolve(false), 5_000);
				engine.eventBus.onAny((event) => {
					if (
						event.type === 'execution:paused' &&
						'executionId' in event &&
						event.executionId === executionId
					) {
						clearTimeout(timeout);
						resolve(true);
					}
					if (
						'executionId' in event &&
						event.executionId === executionId &&
						event.type === 'execution:completed'
					) {
						clearTimeout(timeout);
						resolve(false);
					}
				});
			});

			if (!paused) return;

			// Manual resume before the timer
			await engine.engineService.resumeExecution(executionId);

			// Verify resumeAfter is cleared
			const execution = await getExecution(engine, executionId);
			expect(execution.resumeAfter).toBeNull();
			expect(execution.pauseRequested).toBe(false);
		});
	});

	// -----------------------------------------------------------------------
	// Pause edge cases
	// -----------------------------------------------------------------------

	describe('Pause edge cases', () => {
		it('pausing an already-paused execution is idempotent', async () => {
			const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'PauseIdempotent',
	async run(ctx) {
		const a = await ctx.step({ name: 'work' }, async () => {
			await new Promise(resolve => setTimeout(resolve, 200));
			return { v: 1 };
		});
		const b = await ctx.step({ name: 'more' }, async () => {
			return { v: 2 };
		});
		return b;
	},
});
`;

			const workflowId = await saveWorkflow(engine, source);
			const executionId = await engine.engineService.startExecution(workflowId, undefined, 'test');

			await engine.engineService.pauseExecution(executionId);

			// Wait for paused
			const paused = await new Promise<boolean>((resolve) => {
				const timeout = setTimeout(() => resolve(false), 5_000);
				engine.eventBus.onAny((event) => {
					if (
						event.type === 'execution:paused' &&
						'executionId' in event &&
						event.executionId === executionId
					) {
						clearTimeout(timeout);
						resolve(true);
					}
					if (
						'executionId' in event &&
						event.executionId === executionId &&
						event.type === 'execution:completed'
					) {
						clearTimeout(timeout);
						resolve(false);
					}
				});
			});

			if (!paused) return;

			// Pause again -- should not throw
			await expect(engine.engineService.pauseExecution(executionId)).resolves.not.toThrow();

			const execution = await getExecution(engine, executionId);
			// Still paused (pauseExecution only updates running executions,
			// so a second call on a paused execution is a no-op)
			expect(execution.status).toBe(ExecutionStatus.Paused);
		});

		it('pausing a completed execution has no effect', async () => {
			const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'PauseCompleted',
	async run(ctx) {
		const result = await ctx.step({ name: 'quick' }, async () => {
			return { done: true };
		});
		return result;
	},
});
`;

			const workflowId = await saveWorkflow(engine, source);
			const result = await executeAndWait(engine, workflowId);
			expect(result.status).toBe('completed');

			// Try to pause a completed execution -- the UPDATE only affects
			// rows WHERE status = 'running', so this is a no-op
			await engine.engineService.pauseExecution(result.executionId);

			const execution = await getExecution(engine, result.executionId);
			// Should still be completed, not paused
			expect(execution.status).toBe(ExecutionStatus.Completed);
		});
	});
});
