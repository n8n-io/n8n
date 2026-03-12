/**
 * F31b: Filter — Number Greater Than
 *
 * Demonstrates filtering with a numeric comparison (>). Fetches users,
 * filters those with id > 5, then notifies them.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F31b - Filter Number Gt',
	triggers: [webhook('/f31b-filter-number-gt', { method: 'POST' })],
	async run(ctx) {
		const users = await ctx.step({ name: 'Get Users' }, async () => {
			const res = await fetch('https://dummyjson.com/users?limit=10');
			const data = (await res.json()) as { users: Array<{ id: number; firstName: string }> };
			return data.users.map((u) => ({ id: u.id, name: u.firstName }));
		});

		const filtered = await ctx.step({ name: 'Filter' }, async () => {
			return users.filter((user) => user.id > 5);
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
