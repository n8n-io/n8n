/**
 * F23: Merge Node
 *
 * Demonstrates fan-out and merge pattern using Promise.all.
 * Two independent API calls run in parallel, their results are
 * combined in a merge step.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F23 - Merge Node',
	triggers: [webhook('/f23-merge-node', { method: 'POST' })],
	async run(ctx) {
		// Fan-out: two parallel fetch steps
		const [users, orders] = await Promise.all([
			ctx.step({ name: 'Fetch Users' }, async () => {
				const res = await fetch('https://dummyjson.com/users?limit=5');
				const data = (await res.json()) as { users: Array<Record<string, unknown>> };
				return data.users;
			}),
			ctx.step({ name: 'Fetch Orders' }, async () => {
				const res = await fetch('https://dummyjson.com/carts?limit=5');
				const data = (await res.json()) as { carts: Array<Record<string, unknown>> };
				return data.carts;
			}),
		]);

		// Merge: combine results
		const merged = await ctx.step({ name: 'Process Result' }, async () => {
			return {
				users,
				orders,
				combined: users.length + orders.length,
			};
		});

		return merged;
	},
});
