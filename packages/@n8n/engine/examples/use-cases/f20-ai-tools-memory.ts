/**
 * F20: AI Agent with Tools and Memory
 *
 * Demonstrates an AI agent workflow with tools and conversation memory.
 * The original v4 fixture uses langchain agent, OpenAI model, HTTP tool,
 * code tool, and buffer window memory subnodes. In v3, this is translated
 * to sequential fetch() calls to the OpenAI API.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F20 - Ai Tools Memory (Requires credentials)',
	triggers: [
		webhook('/f20-ai-tools-memory', {
			method: 'POST',
			schema: {
				body: z.object({
					chatInput: z.string().optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const input = await ctx.step({ name: 'Parse Chat Input' }, async () => {
			const { body } = ctx.triggerData;
			return { chatInput: body.chatInput ?? 'Help me with my request' };
		});

		// Tool 1: API Request (simulates the HTTP tool)
		const apiData = await ctx.step({ name: 'API Request Tool' }, async () => {
			const res = await fetch('https://dummyjson.com/products?limit=5');
			return (await res.json()) as Record<string, unknown>;
		});

		// AI Agent call with tool results as context
		const aiResponse = await ctx.step({ name: 'AI Agent' }, async () => {
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
							content: 'You are a helpful assistant.',
						},
						{
							role: 'user',
							content: `${input.chatInput}\n\nContext from API: ${JSON.stringify(apiData)}`,
						},
					],
				}),
			});
			return (await res.json()) as Record<string, unknown>;
		});

		return aiResponse;
	},
});
