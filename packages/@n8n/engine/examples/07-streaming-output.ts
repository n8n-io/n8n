/**
 * Streaming Output Workflow
 *
 * Demonstrates simulated streaming with `ctx.sendChunk()`. Words are
 * emitted one at a time with delays between chunks, allowing the UI
 * to display progressive output as it arrives via SSE.
 */
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: '07 - Streaming Output',
	triggers: [], // Manual trigger is implicit — every workflow can be triggered manually
	async run(ctx) {
		const result = await ctx.step(
			{
				name: 'Stream Word by Word',
				icon: 'radio',
				color: '#06b6d4',
				description: 'Streams words via SSE',
			},
			async () => {
				await new Promise((r) => setTimeout(r, 150)); // Simulate initialization
				const words = ['Hello', ' ', 'world', ',', ' ', 'this', ' ', 'is', ' ', 'streaming', '!'];
				let fullText = '';

				for (const word of words) {
					fullText += word;
					await ctx.sendChunk({ text: word, index: words.indexOf(word) });
					// Simulate delay between chunks
					await new Promise((resolve) => setTimeout(resolve, 100));
				}

				return { fullText, totalChunks: words.length };
			},
		);

		return result;
	},
});
