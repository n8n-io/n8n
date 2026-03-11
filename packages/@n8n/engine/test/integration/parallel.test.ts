import { createHash } from 'node:crypto';

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

function sha256(input: string): string {
	return createHash('sha256').update(input).digest('hex').substring(0, 12);
}

describe.skipIf(!process.env.DATABASE_URL)('Parallel Merge', () => {
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
	// Two independent steps run in parallel
	// -----------------------------------------------------------------------

	it('runs two independent steps in parallel', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Parallel',
	async run(ctx) {
		const a = await ctx.step({ name: 'branch-a' }, async () => {
			return { fromA: 'alpha' };
		});
		const b = await ctx.step({ name: 'branch-b' }, async () => {
			return { fromB: 'beta' };
		});
		return { a, b };
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');

		// Both steps should be completed
		const steps = await getStepExecutions(engine, result.executionId);
		const branchA = steps.find((s) => s.stepId === sha256('branch-a'));
		const branchB = steps.find((s) => s.stepId === sha256('branch-b'));

		expect(branchA).toBeDefined();
		expect(branchA!.status).toBe(StepStatus.Completed);
		expect(branchA!.output).toEqual({ fromA: 'alpha' });

		expect(branchB).toBeDefined();
		expect(branchB!.status).toBe(StepStatus.Completed);
		expect(branchB!.output).toEqual({ fromB: 'beta' });
	});

	// -----------------------------------------------------------------------
	// Merge step only queued when both predecessors complete
	// -----------------------------------------------------------------------

	it('queues merge step only when ALL predecessors complete', async () => {
		// call-api and query-db both depend on prepare (reference input.query).
		// merge-results depends on both call-api and query-db.
		// Graph: trigger -> prepare -> call-api -> merge-results
		//                           -> query-db -> merge-results
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'ParallelMerge',
	async run(ctx) {
		const input = await ctx.step({ name: 'prepare' }, async () => {
			return { query: 'test' };
		});
		const apiResult = await ctx.step({ name: 'call-api' }, async () => {
			return { source: 'api', query: input.query, results: ['r1', 'r2'] };
		});
		const dbResult = await ctx.step({ name: 'query-db' }, async () => {
			return { source: 'db', query: input.query, results: ['d1', 'd2', 'd3'] };
		});
		const merged = await ctx.step({ name: 'merge-results' }, async () => {
			return {
				totalResults: apiResult.results.length + dbResult.results.length,
				combined: [...apiResult.results, ...dbResult.results],
			};
		});
		return merged;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');
		expect(result.result).toEqual({
			totalResults: 5,
			combined: ['r1', 'r2', 'd1', 'd2', 'd3'],
		});

		// Verify merge step received both predecessors' outputs as input
		const steps = await getStepExecutions(engine, result.executionId);
		const mergeStep = steps.find((s) => s.stepId === sha256('merge-results'));

		expect(mergeStep).toBeDefined();
		expect(mergeStep!.status).toBe(StepStatus.Completed);

		const mergeInput = mergeStep!.input as Record<string, unknown>;
		expect(mergeInput[sha256('call-api')]).toEqual({
			source: 'api',
			query: 'test',
			results: ['r1', 'r2'],
		});
		expect(mergeInput[sha256('query-db')]).toEqual({
			source: 'db',
			query: 'test',
			results: ['d1', 'd2', 'd3'],
		});
	});

	// -----------------------------------------------------------------------
	// Parallel failure (fail fast)
	// -----------------------------------------------------------------------

	it('fails execution when a parallel branch fails (fail fast)', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'ParallelFail',
	async run(ctx) {
		const success = await ctx.step({ name: 'success-branch' }, async () => {
			return { ok: true };
		});
		const fail = await ctx.step({ name: 'fail-branch' }, async () => {
			throw new TypeError('Intentional failure in branch');
		});
		const merge = await ctx.step({ name: 'merge' }, async () => {
			return { merged: success.ok, failed: fail };
		});
		return merge;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('failed');

		// Verify the merge step was never completed
		const steps = await getStepExecutions(engine, result.executionId);
		const mergeStep = steps.find((s) => s.stepId === sha256('merge'));

		// Merge step should either not exist or not be completed
		if (mergeStep) {
			expect(mergeStep.status).not.toBe(StepStatus.Completed);
		}
	});

	// -----------------------------------------------------------------------
	// Three-way merge
	// -----------------------------------------------------------------------

	it('handles three-way merge: queued when all 3 predecessors complete', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'ThreeWayMerge',
	async run(ctx) {
		const a = await ctx.step({ name: 'branch-1' }, async () => {
			return { val: 10 };
		});
		const b = await ctx.step({ name: 'branch-2' }, async () => {
			return { val: 20 };
		});
		const c = await ctx.step({ name: 'branch-3' }, async () => {
			return { val: 30 };
		});
		const merged = await ctx.step({ name: 'merge-all' }, async () => {
			return { total: a.val + b.val + c.val };
		});
		return merged;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');
		expect(result.result).toEqual({ total: 60 });

		// Verify the merge step received all 3 predecessors' outputs
		const steps = await getStepExecutions(engine, result.executionId);
		const mergeStep = steps.find((s) => s.stepId === sha256('merge-all'));

		expect(mergeStep).toBeDefined();
		expect(mergeStep!.status).toBe(StepStatus.Completed);

		const mergeInput = mergeStep!.input as Record<string, unknown>;
		expect(mergeInput[sha256('branch-1')]).toEqual({ val: 10 });
		expect(mergeInput[sha256('branch-2')]).toEqual({ val: 20 });
		expect(mergeInput[sha256('branch-3')]).toEqual({ val: 30 });
	});

	// -----------------------------------------------------------------------
	// Diamond pattern: A -> B, A -> C, B -> D, C -> D
	// -----------------------------------------------------------------------

	it('handles diamond pattern correctly', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Diamond',
	async run(ctx) {
		const root = await ctx.step({ name: 'root' }, async () => {
			return { base: 100 };
		});
		const left = await ctx.step({ name: 'left' }, async () => {
			return { left: root.base * 2 };
		});
		const right = await ctx.step({ name: 'right' }, async () => {
			return { right: root.base * 3 };
		});
		const bottom = await ctx.step({ name: 'bottom' }, async () => {
			return { sum: left.left + right.right };
		});
		return bottom;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');
		expect(result.result).toEqual({ sum: 500 }); // 200 + 300
	});

	// -----------------------------------------------------------------------
	// Sequential chain (not parallel, just verifying dependency ordering)
	// -----------------------------------------------------------------------

	it('preserves sequential dependency ordering in step execution', async () => {
		const source = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Sequential',
	async run(ctx) {
		const a = await ctx.step({ name: 'first' }, async () => ({ order: 1 }));
		const b = await ctx.step({ name: 'second' }, async () => ({ order: 2, prev: a.order }));
		const c = await ctx.step({ name: 'third' }, async () => ({ order: 3, prev: b.order }));
		return c;
	},
});
`;

		const workflowId = await saveWorkflow(engine, source);
		const result = await executeAndWait(engine, workflowId);

		expect(result.status).toBe('completed');
		expect(result.result).toEqual({ order: 3, prev: 2 });

		// Verify all steps completed in order
		const steps = await getStepExecutions(engine, result.executionId);
		const first = steps.find((s) => s.stepId === sha256('first'));
		const second = steps.find((s) => s.stepId === sha256('second'));
		const third = steps.find((s) => s.stepId === sha256('third'));

		expect(first!.output).toEqual({ order: 1 });
		expect(second!.output).toEqual({ order: 2, prev: 1 });
		expect(third!.output).toEqual({ order: 3, prev: 2 });
	});
});
