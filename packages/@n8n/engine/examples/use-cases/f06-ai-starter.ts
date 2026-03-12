/**
 * F06: AI Starter
 *
 * Demonstrates an AI workflow that calls the OpenAI API.
 * The original v4 fixture used a chat trigger with an AI agent
 * and OpenAI model subnode. In v3, this becomes a webhook trigger
 * with a step that calls the OpenAI API via fetch().
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F06 - Ai Starter (Requires credentials)',
	triggers: [
		webhook('/f06-ai-starter', {
			method: 'POST',
			schema: {
				body: z.object({
					chatInput: z.string().optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const input = await ctx.step(
			{ name: 'Parse Chat Input', icon: 'settings', color: '#6b7280' },
			async () => {
				const { body } = ctx.triggerData;
				return { chatInput: body.chatInput ?? 'Hello, how can you help me?' };
			},
		);

		const aiResponse = await ctx.step(
			{ name: 'AI Agent', icon: 'bot', color: '#ec4899' },
			async () => {
				const res = await fetch('https://dummyjson.com/posts/add', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${ctx.getSecret('OPENAI_API_KEY')}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						model: 'gpt-4o',
						messages: [
							{
								role: 'system',
								content:
									'You are a friendly Agent designed to guide users through setup steps. Respond concisely.',
							},
							{ role: 'user', content: input.chatInput },
						],
					}),
				});
				return (await res.json()) as Record<string, unknown>;
			},
		);

		return aiResponse;
	},
});
