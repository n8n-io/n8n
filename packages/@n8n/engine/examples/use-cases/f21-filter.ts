/**
 * F21: Filter
 *
 * Demonstrates filtering data between steps. Fetches items,
 * filters to active ones, then sends notifications for the
 * filtered subset.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F21 - Filter',
	triggers: [webhook('/f21-filter', { method: 'POST' })],
	async run(ctx) {
		const allItems = await ctx.step({ name: 'HTTP Request' }, async () => {
			const res = await fetch('https://dummyjson.com/products?limit=5');
			const data = (await res.json()) as {
				products: Array<{ id: number; [key: string]: unknown }>;
			};
			return data.products.map((p) => ({ status: 'active', id: p.id }));
		});

		const activeItems = await ctx.step({ name: 'Filter Active' }, async () => {
			return allItems.filter((item) => item.status === 'active');
		});

		const notified = await ctx.step({ name: 'Notify Active' }, async () => {
			const results = [];
			for (const item of activeItems) {
				await fetch('https://dummyjson.com/posts/add', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ id: item.id }),
				});
				results.push({ id: item.id, notified: true });
			}
			return results;
		});

		return notified;
	},
});
