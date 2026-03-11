/**
 * Conditional Logic Workflow
 *
 * Demonstrates if/else branching based on step output. A random
 * monetary amount is generated, and the workflow routes to either
 * a high-value alert or a normal log step depending on the threshold.
 */
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Conditional Logic',
	triggers: [], // Manual trigger is implicit — every workflow can be triggered manually
	async run(ctx) {
		const data = await ctx.step(
			{
				name: 'Fetch Random Amount',
				icon: 'shuffle',
				color: '#3b82f6',
				description: 'Generates random amount',
			},
			async () => {
				await new Promise((r) => setTimeout(r, 250)); // Simulate API fetch
				return { amount: Math.random() * 200, currency: 'USD' };
			},
		);

		if (data.amount > 100) {
			await ctx.step(
				{
					name: 'Send High Value Alert',
					icon: 'alert-triangle',
					color: '#ef4444',
					description: 'Alert for amounts over $100',
				},
				async () => {
					await new Promise((r) => setTimeout(r, 300)); // Simulate sending alert
					return { alert: true, message: `High value: ${data.amount} ${data.currency}` };
				},
			);
		} else {
			await ctx.step(
				{
					name: 'Log Normal Transaction',
					icon: 'file-text',
					color: '#6b7280',
					description: 'Logs amounts under $100',
				},
				async () => {
					await new Promise((r) => setTimeout(r, 150)); // Simulate logging
					return { alert: false, message: `Normal: ${data.amount} ${data.currency}` };
				},
			);
		}

		return data;
	},
});
