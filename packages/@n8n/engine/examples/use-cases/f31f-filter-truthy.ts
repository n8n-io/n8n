/**
 * F31f: Filter — Truthy Check
 *
 * Demonstrates filtering for truthy values. Fetches users,
 * filters those that have a truthy phone field, then notifies them.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F31f - Filter Truthy',
	triggers: [webhook('/f31f-filter-truthy', { method: 'POST' })],
	async run(ctx) {
		const users = await ctx.step({ name: 'Get Users' }, async () => {
			const res = await fetch('https://dummyjson.com/users?limit=10');
			const data = (await res.json()) as { users: Array<{ id: number; phone?: string }> };
			return data.users;
		});

		const filtered = await ctx.step({ name: 'Filter' }, async () => {
			return users.filter((user) => !!user.phone);
		});

		const notified = await ctx.step({ name: 'Notify User' }, async () => {
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
		});

		return notified;
	},
});
