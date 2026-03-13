/**
 * F16: Try-Switch
 *
 * Demonstrates error handling inside a step combined with switch routing.
 * Fetches data with try/catch inside the step, then routes based on the
 * data type field (email, sms, or unknown).
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F16 - Try Switch',
	triggers: [webhook('/f16-try-switch', { method: 'POST' })],
	async run(ctx) {
		const data = await ctx.step(
			{
				name: 'Fetch Data',
				icon: 'globe',
				color: '#3b82f6',
				description: 'Fetches data with error handling',
			},
			async () => {
				try {
					const res = await fetch('https://dummyjson.com/products?limit=5');
					if (!res.ok) throw new Error(`HTTP ${res.status}`);
					return (await res.json()) as { type?: string };
				} catch (error) {
					return {
						error: true,
						message: error instanceof Error ? error.message : 'Unknown error',
					};
				}
			},
		);

		if ('error' in data && data.error) {
			return data;
		}

		const type = (data as { type?: string }).type ?? 'unknown';

		switch (type) {
			case 'email': {
				return await ctx.step({ name: 'Send Email', icon: 'mail', color: '#f97316' }, async () => {
					await fetch('https://dummyjson.com/posts/add', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ to: 'user@example.com' }),
					});
					return { channel: 'email', sent: true };
				});
			}
			case 'sms': {
				return await ctx.step(
					{ name: 'Send SMS', icon: 'message-circle', color: '#f97316' },
					async () => {
						await fetch('https://dummyjson.com/posts/add', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ to: '+1234567890' }),
						});
						return { channel: 'sms', sent: true };
					},
				);
			}
			default: {
				return await ctx.step(
					{ name: 'Log Unknown', icon: 'clipboard', color: '#6b7280' },
					async () => {
						return { channel: 'unknown', type };
					},
				);
			}
		}
	},
});
