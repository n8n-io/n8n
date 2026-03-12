/**
 * F14: Loop with Try-Catch
 *
 * Demonstrates batch processing with error handling per item.
 * Fetches users, processes each one with try/catch to handle
 * failures gracefully, then produces a summary.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F14 - Loop Try Catch (Not supported yet)',
	triggers: [webhook('/f14-loop-try-catch', { method: 'POST' })],
	async run(ctx) {
		const users = await ctx.step({ name: 'HTTP Request' }, async () => {
			const res = await fetch('https://dummyjson.com/users?limit=5');
			const data = (await res.json()) as { users: Array<{ email: string }> };
			return data.users;
		});

		// --- UNSUPPORTED: Batch step (3-arg ctx.step) ---
		// The source workflow uses batch() with try/catch per item.
		// The v3 engine does not yet support the 3-arg batch step.
		// Using a regular step with a for-of loop and try/catch instead.
		//
		// const results = await ctx.step(
		//   { name: 'Send Email', batch: { onItemFailure: 'continue' } },
		//   users,
		//   async (user) => {
		//     try {
		//       await fetch('https://dummyjson.com/posts/add', {
		//         method: 'POST',
		//         body: JSON.stringify({ to: user.email }),
		//       });
		//       return { sent: true };
		//     } catch (e) {
		//       return { sent: false, error: (e as Error).message };
		//     }
		//   }
		// );
		//
		// --- END UNSUPPORTED ---

		const results = await ctx.step({ name: 'Send Emails' }, async () => {
			const outcomes = [];
			for (const user of users) {
				try {
					await fetch('https://dummyjson.com/posts/add', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ to: user.email }),
					});
					outcomes.push({ email: user.email, sent: true });
				} catch (e) {
					outcomes.push({
						email: user.email,
						sent: false,
						error: (e as Error).message,
					});
				}
			}
			return outcomes;
		});

		const summary = await ctx.step({ name: 'Summary' }, async () => {
			const sent = results.filter((r) => r.sent).length;
			const failed = results.filter((r) => !r.sent).length;
			return { total: results.length, sent, failed };
		});

		return summary;
	},
});
