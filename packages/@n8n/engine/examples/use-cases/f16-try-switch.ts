/**
 * F16: Try-Switch
 *
 * Demonstrates try/catch wrapping a switch statement. Fetches data
 * with error handling, then routes based on the data type field
 * (email, sms, or unknown).
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F16 - Try Switch',
	triggers: [webhook('/f16-try-switch', { method: 'POST' })],
	async run(ctx) {
		let data: { type: string };

		try {
			data = await ctx.step({ name: 'HTTP Request' }, async () => {
				const res = await fetch('https://dummyjson.com/products?limit=5');
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return (await res.json()) as { type: string };
			});
		} catch (error) {
			const handled = await ctx.step({ name: 'Error Handler' }, async () => {
				return {
					error: true,
					message: error instanceof Error ? error.message : 'Unknown error',
				};
			});
			return handled;
		}

		switch (data.type) {
			case 'email': {
				const result = await ctx.step({ name: 'Send Email' }, async () => {
					await fetch('https://dummyjson.com/posts/add', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ to: 'user@example.com' }),
					});
					return { channel: 'email', sent: true };
				});
				return result;
			}
			case 'sms': {
				const result = await ctx.step({ name: 'Send SMS' }, async () => {
					await fetch('https://dummyjson.com/posts/add', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ to: '+1234567890' }),
					});
					return { channel: 'sms', sent: true };
				});
				return result;
			}
			default: {
				const result = await ctx.step({ name: 'Log Unknown' }, async () => {
					return { channel: 'unknown', type: data.type };
				});
				return result;
			}
		}
	},
});
