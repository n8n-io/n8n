/**
 * F22: Try-Multi-Subworkflow
 *
 * Demonstrates try/catch wrapping a sub-workflow execution.
 * The original v4 fixture uses executeWorkflow with an inline
 * sub-workflow definition. In v3, we use ctx.triggerWorkflow()
 * with try/catch to handle sub-workflow failures gracefully.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F22 - Try Multi Subworkflow',
	triggers: [webhook('/f22-try-multi-subworkflow', { method: 'POST' })],
	async run(ctx) {
		try {
			const result = await ctx.triggerWorkflow({
				workflow: '01 - Hello World',
			});

			const transformed = await ctx.step(
				{ name: 'Transform', icon: 'zap', color: '#8b5cf6' },
				async () => {
					return { result, transformed: true };
				},
			);

			return transformed;
		} catch (error) {
			const handled = await ctx.step(
				{ name: 'Error Handler', icon: 'bug', color: '#ef4444' },
				async () => {
					return {
						error: true,
						message: error instanceof Error ? error.message : 'Unknown error',
					};
				},
			);
			return handled;
		}
	},
});
