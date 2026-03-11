/**
 * AI Chat Streaming Workflow
 *
 * Demonstrates an AI agent webhook that streams its response word by
 * word using `ctx.sendChunk()`. Simulates an LLM-style streaming
 * response where tokens arrive incrementally, then responds to the
 * webhook caller with the full assembled text.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'AI Chat',
	triggers: [webhook('/chat', { method: 'POST', responseMode: 'respondWithNode' })],
	async run(ctx) {
		const response = await ctx.step(
			{
				name: 'Run AI Chat Agent',
				icon: 'bot',
				color: '#ec4899',
				description: 'Streams AI response',
			},
			async () => {
				const message = ctx.triggerData?.body?.message ?? 'hello';
				await new Promise((r) => setTimeout(r, 300)); // Simulate model loading
				// Simulate AI streaming response
				const words = `I'll help you with: ${message}`.split(' ');
				let fullText = '';

				for (const word of words) {
					fullText += (fullText ? ' ' : '') + word;
					await ctx.sendChunk({ text: word + ' ' });
					await new Promise((resolve) => setTimeout(resolve, 150)); // Simulate token generation
				}

				// Respond to the webhook caller
				await ctx.respondToWebhook({
					statusCode: 200,
					body: { response: fullText },
				});

				return { fullText };
			},
		);
	},
});
