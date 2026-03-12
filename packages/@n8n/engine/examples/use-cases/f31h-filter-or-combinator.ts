/**
 * F31h: Filter — OR Combinator
 *
 * Demonstrates filtering with multiple conditions combined with ||.
 * Fetches users, filters those with username 'emilys' OR 'michaelw'.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F31h - Filter Or Combinator',
	triggers: [webhook('/f31h-filter-or-combinator', { method: 'POST' })],
	async run(ctx) {
		const users = await ctx.step({ name: 'Get Users' }, async () => {
			const res = await fetch('https://dummyjson.com/users?limit=10');
			const data = (await res.json()) as { users: Array<{ id: number; username: string }> };
			return data.users;
		});

		const filtered = await ctx.step({ name: 'Filter' }, async () => {
			return users.filter((user) => user.username === 'emilys' || user.username === 'michaelw');
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
