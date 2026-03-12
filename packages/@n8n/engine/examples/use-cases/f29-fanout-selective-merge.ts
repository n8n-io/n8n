/**
 * F29: Fan-Out with Selective Merge
 *
 * Demonstrates fan-out to three parallel branches, where only two
 * are merged and the third runs independently. Users and Orders are
 * fetched in parallel and merged, while Admin notification runs
 * independently.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F29 - Fanout Selective Merge',
	triggers: [webhook('/f29-fanout-selective-merge', { method: 'POST' })],
	async run(ctx) {
		// Three parallel branches — two merge, one independent
		const [merged, adminNotified] = await Promise.all([
			// Merged branch: Users + Orders
			(async () => {
				const [users, orders] = await Promise.all([
					ctx.step({ name: 'Fetch Users', icon: 'globe', color: '#3b82f6' }, async () => {
						const res = await fetch('https://dummyjson.com/users?limit=5');
						const data = (await res.json()) as { users: Array<Record<string, unknown>> };
						return data.users;
					}),
					ctx.step({ name: 'Fetch Orders', icon: 'globe', color: '#3b82f6' }, async () => {
						const res = await fetch('https://dummyjson.com/carts?limit=5');
						const data = (await res.json()) as { carts: Array<Record<string, unknown>> };
						return data.carts;
					}),
				]);

				const combined = await ctx.step(
					{ name: 'Process Combined', icon: 'layers', color: '#8b5cf6' },
					async () => {
						return { users, orders, totalItems: users.length + orders.length };
					},
				);

				return combined;
			})(),
			// Independent branch: Admin notification
			ctx.step({ name: 'Notify Admin', icon: 'send', color: '#f97316' }, async () => {
				await fetch('https://dummyjson.com/posts/add', { method: 'POST' });
				return { adminNotified: true };
			}),
		]);

		return { merged, adminNotified };
	},
});
