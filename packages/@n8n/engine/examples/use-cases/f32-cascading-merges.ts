/**
 * F32: Cascading Merges
 *
 * Demonstrates cascading merge pattern: three data sources are
 * fetched in parallel, A and B are merged first, then that result
 * is merged with C.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F32 - Cascading Merges',
	triggers: [webhook('/f32-cascading-merges', { method: 'POST' })],
	async run(ctx) {
		// Fetch all three sources in parallel
		const [sourceA, sourceB, sourceC] = await Promise.all([
			ctx.step({ name: 'Fetch A' }, async () => {
				const res = await fetch('https://dummyjson.com/products?limit=3');
				const data = (await res.json()) as { products: Array<Record<string, unknown>> };
				return data.products;
			}),
			ctx.step({ name: 'Fetch B' }, async () => {
				const res = await fetch('https://dummyjson.com/users?limit=3');
				const data = (await res.json()) as { users: Array<Record<string, unknown>> };
				return data.users;
			}),
			ctx.step({ name: 'Fetch C' }, async () => {
				const res = await fetch('https://dummyjson.com/posts?limit=3');
				const data = (await res.json()) as { posts: Array<Record<string, unknown>> };
				return data.posts;
			}),
		]);

		// First merge: A + B
		const mergedAB = await ctx.step({ name: 'Merge A+B' }, async () => {
			return [...sourceA, ...sourceB];
		});

		// Second merge: AB + C
		const mergedAll = await ctx.step({ name: 'Merge AB+C' }, async () => {
			return [...mergedAB, ...sourceC];
		});

		// Final processing
		const result = await ctx.step({ name: 'Final Process' }, async () => {
			return {
				totalItems: mergedAll.length,
				fromA: sourceA.length,
				fromB: sourceB.length,
				fromC: sourceC.length,
				data: mergedAll,
			};
		});

		return result;
	},
});
