/**
 * F11: Mixed Execution
 *
 * Demonstrates mixed execution: an execute-once fetch followed by
 * per-item processing. Fetches a list of users, then processes
 * each user individually using a batch step.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F11 - Mixed Execution',
	triggers: [webhook('/f11-mixed-execution', { method: 'POST' })],
	async run(ctx) {
		const users = await ctx.step(
			{ name: 'Fetch Users', icon: 'globe', color: '#3b82f6' },
			async () => {
				const res = await fetch('https://dummyjson.com/users?limit=5');
				const data = (await res.json()) as { users: Array<{ email: string; firstName: string }> };
				return data.users.map((u) => ({ email: u.email, name: u.firstName }));
			},
		);

		const results = await ctx.batch(
			{ name: 'Send Email', icon: 'mail', color: '#f97316', onItemFailure: 'continue' },
			users,
			async (user) => {
				await fetch('https://dummyjson.com/posts/add', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ to: user.email, subject: 'Welcome', text: user.name }),
				});
				return { email: user.email, sent: true };
			},
		);

		return results;
	},
});
