/**
 * F31e: Filter — Field Exists
 *
 * Demonstrates filtering for field existence (!== undefined). Fetches
 * users, filters those that have a maidenName field, then notifies them.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F31e - Filter Exists',
	triggers: [webhook('/f31e-filter-exists', { method: 'POST' })],
	async run(ctx) {
		const users = await ctx.step(
			{ name: 'Get Users', icon: 'globe', color: '#3b82f6' },
			async () => {
				const res = await fetch('https://dummyjson.com/users?limit=10');
				const data = (await res.json()) as { users: Array<{ id: number; maidenName?: string }> };
				return data.users;
			},
		);

		const filtered = await ctx.step(
			{ name: 'Filter', icon: 'filter', color: '#8b5cf6' },
			async () => {
				return users.filter((user) => user.maidenName !== undefined);
			},
		);

		const notified = await ctx.step(
			{ name: 'Notify User', icon: 'send', color: '#f97316' },
			async () => {
				const results = [];
				for (const user of filtered) {
					await fetch('https://dummyjson.com/posts/add', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ userId: user.id }),
					});
					results.push({ id: user.id, notified: true });
				}
				return results;
			},
		);

		return notified;
	},
});
