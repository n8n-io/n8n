/**
 * F13: For-Of Loop
 *
 * Demonstrates batch processing with a loop. Fetches a list of items,
 * then processes each one individually using a batch step.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F13 - For Of Loop',
	triggers: [webhook('/f13-for-of-loop', { method: 'POST' })],
	async run(ctx) {
		const items = await ctx.step(
			{ name: 'HTTP Request', icon: 'globe', color: '#3b82f6' },
			async () => {
				const res = await fetch('https://dummyjson.com/products?limit=5');
				const data = (await res.json()) as { products: Array<Record<string, unknown>> };
				return data.products;
			},
		);

		const results = await ctx.batch(
			{ name: 'Process Item', icon: 'zap', color: '#8b5cf6', onItemFailure: 'continue' },
			items,
			async (item) => {
				return { processed: true, item };
			},
		);

		return results;
	},
});
