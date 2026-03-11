/**
 * Predefined workflow source code for tests.
 * These are used by integration tests and the CLI bench command.
 */

export const HELLO_WORLD_SOURCE = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Hello World',
	async run(ctx) {
		const greeting = await ctx.step({ name: 'greet' }, async () => {
			return { message: 'Hello from Engine v2!', timestamp: Date.now() };
		});
		const result = await ctx.step({ name: 'format' }, async () => {
			return { formatted: greeting.message + ' (formatted)' };
		});
		return result;
	},
});
`;

export const LINEAR_3_STEP_SOURCE = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Linear 3 Step',
	async run(ctx) {
		const a = await ctx.step({ name: 'step-a' }, async () => ({ value: 1 }));
		const b = await ctx.step({ name: 'step-b' }, async () => ({ value: a.value + 1 }));
		const c = await ctx.step({ name: 'step-c' }, async () => ({ value: b.value + 1 }));
		return c;
	},
});
`;

export const PARALLEL_MERGE_SOURCE = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Parallel Merge',
	async run(ctx) {
		const input = await ctx.step({ name: 'prepare' }, async () => ({ query: 'test' }));
		const [apiResult, dbResult] = await Promise.all([
			ctx.step({ name: 'call-api' }, async () => ({ source: 'api', data: [1, 2] })),
			ctx.step({ name: 'query-db' }, async () => ({ source: 'db', data: [3, 4, 5] })),
		]);
		const merged = await ctx.step({ name: 'merge' }, async () => ({
			total: apiResult.data.length + dbResult.data.length,
			combined: [...apiResult.data, ...dbResult.data],
		}));
		return merged;
	},
});
`;

export const CONDITIONAL_SOURCE = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Conditional',
	async run(ctx) {
		const data = await ctx.step({ name: 'fetch' }, async () => ({ amount: 150 }));
		if (data.amount > 100) {
			await ctx.step({ name: 'high-value' }, async () => ({ alert: true }));
		} else {
			await ctx.step({ name: 'low-value' }, async () => ({ alert: false }));
		}
		return data;
	},
});
`;

export const RETRY_SOURCE = `
import { defineWorkflow } from '@n8n/engine/sdk';

let callCount = 0;
export default defineWorkflow({
	name: 'Retry Test',
	async run(ctx) {
		const result = await ctx.step({
			name: 'flaky',
			retry: { maxAttempts: 5, baseDelay: 100, maxDelay: 500 },
		}, async () => {
			callCount++;
			if (callCount < 3) throw new Error('Temporary failure');
			return { success: true, attempts: callCount };
		});
		return result;
	},
});
`;

export const TEN_STEP_PIPELINE_SOURCE = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Pipeline 10',
	async run(ctx) {
		const s1 = await ctx.step({ name: 's1' }, async () => ({ v: 1 }));
		const s2 = await ctx.step({ name: 's2' }, async () => ({ v: s1.v + 1 }));
		const s3 = await ctx.step({ name: 's3' }, async () => ({ v: s2.v + 1 }));
		const s4 = await ctx.step({ name: 's4' }, async () => ({ v: s3.v + 1 }));
		const s5 = await ctx.step({ name: 's5' }, async () => ({ v: s4.v + 1 }));
		const s6 = await ctx.step({ name: 's6' }, async () => ({ v: s5.v + 1 }));
		const s7 = await ctx.step({ name: 's7' }, async () => ({ v: s6.v + 1 }));
		const s8 = await ctx.step({ name: 's8' }, async () => ({ v: s7.v + 1 }));
		const s9 = await ctx.step({ name: 's9' }, async () => ({ v: s8.v + 1 }));
		const s10 = await ctx.step({ name: 's10' }, async () => ({ v: s9.v + 1 }));
		return s10;
	},
});
`;

export const FAILING_STEP_SOURCE = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Failing Step',
	async run(ctx) {
		await ctx.step({ name: 'will-fail' }, async () => {
			throw new TypeError('Cannot read properties of undefined');
		});
	},
});
`;

export const APPROVAL_SOURCE = `
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Approval',
	async run(ctx) {
		const request = await ctx.step({ name: 'prepare' }, async () => ({
			type: 'expense', amount: 5000,
		}));
		const approval = await ctx.step({
			name: 'approve',
			stepType: 'approval',
		}, async () => ({
			requiresApproval: true,
		}));
		return { approved: approval };
	},
});
`;
