/**
 * 17 - Streaming Webhook
 *
 * Webhook workflow that streams chunks back via SSE.
 * Tests the streaming infrastructure with respondWithNode mode.
 * Each word is sent as a separate chunk with a small delay.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: '17 - Streaming Webhook',
	triggers: [webhook('/stream', { method: 'POST', responseMode: 'respondWithNode' })],
	async run(ctx) {
		const { body } = ctx.triggerData;

		const result = await ctx.step(
			{
				name: 'Stream Response',
				icon: 'radio',
				color: '#06b6d4',
				description: 'Streams text word by word',
			},
			async () => {
				const text = body?.text ?? 'Hello, this is a streaming response from n8n Engine v2!';
				const words = text.split(' ');
				let accumulated = '';

				for (const word of words) {
					accumulated += (accumulated ? ' ' : '') + word;
					await ctx.sendChunk({ word, accumulated, index: words.indexOf(word) });
					await new Promise((r) => setTimeout(r, 100));
				}

				await ctx.respondToWebhook({
					statusCode: 200,
					body: { fullText: accumulated, wordCount: words.length },
				});

				return { fullText: accumulated, wordCount: words.length };
			},
		);

		return result;
	},
});
