/**
 * Sleep and Resume Workflow
 *
 * Demonstrates durable sleep between steps using `ctx.sleep()`. The
 * process is freed during the sleep period, and a child step is created
 * to wake the workflow after the specified duration. Tests that state
 * is preserved across the sleep boundary.
 */
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Sleep and Resume',
	triggers: [], // Manual trigger is implicit — every workflow can be triggered manually
	async run(ctx) {
		const before = await ctx.step(
			{
				name: 'Run Pre-Sleep Task',
				icon: 'play',
				color: '#3b82f6',
				description: 'Work before sleep',
			},
			async () => {
				await new Promise((r) => setTimeout(r, 200)); // Simulate pre-sleep work
				return { timestamp: Date.now(), message: 'about to sleep' };
			},
		);

		// Sleep for 5 seconds — process is freed, child step created
		await ctx.sleep(5000);

		const after = await ctx.step(
			{
				name: 'Resume After Sleep',
				icon: 'clock',
				color: '#22c55e',
				description: 'Continues after delay',
			},
			async () => {
				await new Promise((r) => setTimeout(r, 250)); // Simulate post-sleep work
				return {
					resumedAt: Date.now(),
					sleptFor: Date.now() - before.timestamp,
					originalMessage: before.message,
				};
			},
		);

		return after;
	},
});
