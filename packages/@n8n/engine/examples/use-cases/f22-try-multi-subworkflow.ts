/**
 * F22: Try-Multi-Subworkflow
 *
 * Demonstrates try/catch wrapping a sub-workflow execution.
 * The original v4 fixture uses executeWorkflow with an inline
 * sub-workflow definition. In v3, ctx.triggerWorkflow() is not yet
 * supported, so we simulate the sub-workflow as sequential steps.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F22 - Try Multi Subworkflow (Not supported yet)',
	triggers: [webhook('/f22-try-multi-subworkflow', { method: 'POST' })],
	async run(ctx) {
		try {
			// --- UNSUPPORTED: ctx.triggerWorkflow() ---
			// The source workflow wraps executeWorkflow() in a try/catch.
			// The v3 engine does not yet support ctx.triggerWorkflow().
			// Simulating the sub-workflow inline as sequential steps.
			//
			// const result = await ctx.triggerWorkflow({
			//   workflowId: 'sub-workflow',
			//   input: {},
			// });
			//
			// --- END UNSUPPORTED ---

			const httpResult = await ctx.step({ name: 'HTTP Request' }, async () => {
				const res = await fetch('https://dummyjson.com/products?limit=5');
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return (await res.json()) as Record<string, unknown>;
			});

			const transformed = await ctx.step({ name: 'Transform' }, async () => {
				return { ...httpResult, transformed: true };
			});

			return transformed;
		} catch (error) {
			const handled = await ctx.step({ name: 'Error Handler' }, async () => {
				return {
					error: true,
					message: error instanceof Error ? error.message : 'Unknown error',
				};
			});
			return handled;
		}
	},
});
