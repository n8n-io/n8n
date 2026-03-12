/**
 * F11: Mixed Execution
 *
 * Demonstrates mixed execution: an execute-once fetch followed by
 * per-item processing. Fetches a list of users, then processes
 * each user individually.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F11 - Mixed Execution (Not supported yet)',
	triggers: [webhook('/f11-mixed-execution', { method: 'POST' })],
	async run(ctx) {
		const users = await ctx.step({ name: 'Fetch Users' }, async () => {
			const res = await fetch('https://dummyjson.com/users?limit=5');
			const data = (await res.json()) as { users: Array<{ email: string; firstName: string }> };
			return data.users.map((u) => ({ email: u.email, name: u.firstName }));
		});

		// --- UNSUPPORTED: Batch step (3-arg ctx.step) ---
		// The source workflow processes each user individually using .map()
		// (per-item execution). The v3 engine does not yet support the 3-arg
		// batch step: ctx.step(def, items, fn).
		// Using a regular step with array processing instead.
		//
		// const results = await ctx.step(
		//   { name: 'Send Email', batch: { onItemFailure: 'continue' } },
		//   users,
		//   async (user) => {
		//     await fetch('https://dummyjson.com/posts/add', {
		//       method: 'POST',
		//       body: JSON.stringify({ to: user.email, subject: 'Welcome', text: user.name }),
		//     });
		//     return { sent: true };
		//   }
		// );
		//
		// --- END UNSUPPORTED ---

		const results = await ctx.step({ name: 'Send Emails' }, async () => {
			const sent = [];
			for (const user of users) {
				await fetch('https://dummyjson.com/posts/add', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ to: user.email, subject: 'Welcome', text: user.name }),
				});
				sent.push({ email: user.email, sent: true });
			}
			return sent;
		});

		return results;
	},
});
