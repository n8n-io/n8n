/**
 * F10: Execute-Once Three-Node Chain
 *
 * Demonstrates a three-step chain: fetch data → transform → send
 * notification. Each step runs once and passes data forward.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F10 - Execute Once Three Node',
	triggers: [webhook('/f10-execute-once-three-node', { method: 'POST' })],
	async run(ctx) {
		const userData = await ctx.step({ name: 'Fetch Data' }, async () => {
			const res = await fetch('https://dummyjson.com/users?limit=1');
			const data = (await res.json()) as { users: Array<{ firstName: string }> };
			return { name: data.users[0]?.firstName ?? 'Unknown' };
		});

		const transformed = await ctx.step({ name: 'Transform' }, async () => {
			return { username: userData.name };
		});

		const notification = await ctx.step({ name: 'Send Notification' }, async () => {
			const res = await fetch('https://dummyjson.com/posts/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ user: transformed.username }),
			});
			return { sent: res.ok };
		});

		return notification;
	},
});
