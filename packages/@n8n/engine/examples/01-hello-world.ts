/**
 * Hello World Workflow
 *
 * Demonstrates the simplest possible workflow: two sequential steps
 * that fetch a random quote and format it with attribution. Tests
 * basic step chaining and data passing between steps.
 */
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: '01 - Hello World',
	triggers: [], // Manual trigger is implicit — every workflow can be triggered manually
	async run(ctx) {
		const greeting = await ctx.step(
			{
				name: 'Fetch Random Quote',
				icon: 'message-circle',
				color: '#22c55e',
				description: 'Fetches a random quote from DummyJSON',
			},
			async () => {
				const res = await fetch('https://dummyjson.com/quotes/random');
				const data = (await res.json()) as { id: number; quote: string; author: string };
				return { message: data.quote, author: data.author, timestamp: Date.now() };
			},
		);

		const result = await ctx.step(
			{
				name: 'Format Message',
				icon: 'file-text',
				color: '#8b5cf6',
				description: 'Formats with attribution',
			},
			async () => {
				return {
					formatted: `"${greeting.message}" — ${greeting.author} (at ${new Date(greeting.timestamp).toISOString()})`,
				};
			},
		);

		return result;
	},
});
