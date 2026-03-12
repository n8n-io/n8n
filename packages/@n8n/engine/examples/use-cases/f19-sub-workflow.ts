/**
 * F19: Sub-Workflow
 *
 * Demonstrates executing a child workflow. The original v4 fixture
 * calls executeWorkflow() to generate a report. In v3, we use
 * ctx.triggerWorkflow() to invoke the sub-workflow by name.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F19 - Sub Workflow',
	triggers: [webhook('/f19-sub-workflow', { method: 'POST' })],
	async run(ctx) {
		const input = await ctx.step(
			{ name: 'Prepare Report Input', icon: 'clipboard', color: '#6b7280' },
			async () => {
				return { type: 'monthly' };
			},
		);

		const reportData = await ctx.triggerWorkflow({
			workflow: '01 - Hello World',
			input: { type: input.type },
		});

		const sent = await ctx.step(
			{ name: 'Send Report', icon: 'send', color: '#f97316' },
			async () => {
				const res = await fetch('https://dummyjson.com/posts/add', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(reportData),
				});
				return { sent: res.ok };
			},
		);

		return sent;
	},
});
