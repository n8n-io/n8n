/**
 * Trigger Workflow
 *
 * Demonstrates using `ctx.triggerWorkflow()` to invoke another workflow
 * by name and await its result. The target workflow must exist in the
 * database (e.g., seeded at startup).
 */
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: '19 - Trigger Workflow',
	triggers: [],
	async run(ctx) {
		const data = await ctx.step(
			{
				name: 'Prepare Input',
				icon: 'settings',
				color: '#6b7280',
				description: 'Builds input for the sub-workflow',
			},
			async () => {
				return { message: 'Triggered from workflow 19', timestamp: Date.now() };
			},
		);

		// Trigger the "01 - Hello World" workflow (seeded at startup)
		const result = await ctx.triggerWorkflow({
			workflow: '01 - Hello World',
			input: data,
		});

		return await ctx.step(
			{
				name: 'Process Result',
				icon: 'check-circle',
				color: '#22c55e',
				description: 'Processes the sub-workflow result',
			},
			async () => {
				return { triggeredResult: result, processedAt: Date.now() };
			},
		);
	},
});
