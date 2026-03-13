/**
 * F14: Loop with Try-Catch
 *
 * Demonstrates batch processing with error handling per item.
 * Fetches users, processes each one via a batch step with
 * onItemFailure: 'continue' so failures don't stop the batch,
 * then produces a summary.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F14 - Loop Try Catch',
	triggers: [webhook('/f14-loop-try-catch', { method: 'POST' })],
	async run(ctx) {
		const users = await ctx.step(
			{ name: 'HTTP Request', icon: 'globe', color: '#3b82f6' },
			async () => {
				const res = await fetch('https://dummyjson.com/users?limit=5');
				const data = (await res.json()) as { users: Array<{ email: string }> };
				return data.users;
			},
		);

		const results = await ctx.batch(
			{ name: 'Send Email', icon: 'mail', color: '#f97316', onItemFailure: 'continue' },
			users,
			async (user) => {
				await fetch('https://dummyjson.com/posts/add', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ to: user.email }),
				});
				return { email: user.email, sent: true };
			},
		);

		const summary = await ctx.step(
			{ name: 'Summary', icon: 'file-text', color: '#22c55e' },
			async () => {
				const sent = results.filter((r) => r.status === 'fulfilled').length;
				const failed = results.filter((r) => r.status === 'rejected').length;
				return { total: results.length, sent, failed };
			},
		);

		return summary;
	},
});
