/**
 * Hello World Workflow
 *
 * Demonstrates the simplest possible workflow: two sequential steps
 * that greet and format a message. Tests basic step chaining and
 * data passing between steps.
 */
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Hello World',
	triggers: [], // Manual trigger is implicit — every workflow can be triggered manually
	async run(ctx) {
		const greeting = await ctx.step(
			{
				name: 'Generate Greeting',
				icon: 'message-circle',
				color: '#22c55e',
				description: 'Creates a greeting message',
			},
			async () => {
				await new Promise((r) => setTimeout(r, 200)); // Simulate work
				return { message: 'Hello from Engine v2!', timestamp: Date.now() };
			},
		);

		const result = await ctx.step(
			{
				name: 'Format Message',
				icon: 'file-text',
				color: '#8b5cf6',
				description: 'Formats with timestamp',
			},
			async () => {
				await new Promise((r) => setTimeout(r, 150)); // Simulate formatting
				return {
					formatted: `${greeting.message} (at ${new Date(greeting.timestamp).toISOString()})`,
				};
			},
		);

		return result;
	},
});
