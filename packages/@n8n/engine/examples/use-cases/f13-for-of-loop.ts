/**
 * F13: For-Of Loop
 *
 * Demonstrates batch processing with a loop. Fetches a list of items,
 * then processes each one individually inside a step.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F13 - For Of Loop (Not supported yet)',
	triggers: [webhook('/f13-for-of-loop', { method: 'POST' })],
	async run(ctx) {
		const items = await ctx.step({ name: 'HTTP Request' }, async () => {
			const res = await fetch('https://dummyjson.com/products?limit=5');
			const data = (await res.json()) as { products: Array<Record<string, unknown>> };
			return data.products;
		});

		// --- UNSUPPORTED: Batch step (3-arg ctx.step) ---
		// The source workflow uses batch() for per-item processing.
		// The v3 engine does not yet support the 3-arg batch step.
		// Using a regular step with a for-of loop instead.
		//
		// const results = await ctx.step(
		//   { name: 'Process Item', batch: { onItemFailure: 'continue' } },
		//   items,
		//   async (item) => {
		//     return { processed: true, item };
		//   }
		// );
		//
		// --- END UNSUPPORTED ---

		const results = await ctx.step({ name: 'Process Items' }, async () => {
			const processed = [];
			for (const item of items) {
				processed.push({ processed: true, item });
			}
			return processed;
		});

		return results;
	},
});
