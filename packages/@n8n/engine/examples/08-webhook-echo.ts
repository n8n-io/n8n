/**
 * Webhook Echo Workflow
 *
 * Demonstrates webhook trigger handling with input validation and
 * echo response. Tests all four response modes (lastNode,
 * respondImmediately, respondWithNode, allData) and shows how to
 * access HTTP request data (body, headers, query params).
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

// Test each response mode by changing the second argument:
// 'lastNode' | 'respondImmediately' | 'respondWithNode' | 'allData'
export default defineWorkflow({
	name: '08 - Webhook Echo',
	triggers: [
		webhook('/echo', {
			method: 'POST',
			responseMode: 'respondWithNode',
			schema: {
				body: z.object({
					message: z.string(),
				}),
				headers: z.object({
					'x-sender': z.string().optional(),
				}),
				query: z.object({
					urgent: z.enum(['true', 'false']).optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const validated = await ctx.step(
			{
				name: 'Validate Request Body',
				icon: 'shield-check',
				color: '#eab308',
				description: 'Validates required fields',
			},
			async () => {
				const { body, headers, query } = ctx.triggerData;
				if (!body.message) {
					throw new Error('Missing required field: message');
				}
				return {
					message: body.message,
					sender: headers['x-sender'] ?? 'anonymous',
					urgent: query.urgent === 'true',
				};
			},
		);

		await ctx.step(
			{
				name: 'Process & Echo Response',
				icon: 'send',
				color: '#22c55e',
				description: 'Echoes uppercased message',
			},
			async () => {
				const result = {
					echo: validated.message.toUpperCase(),
					sender: validated.sender,
					urgent: validated.urgent,
					processedAt: Date.now(),
				};

				// Respond to the webhook caller with the processed data
				await ctx.respondToWebhook({
					statusCode: 200,
					headers: { 'X-Processed-By': 'n8n-engine' },
					body: result,
				});

				return result;
			},
		);
	},
});
// Usage: curl -X POST http://localhost:3000/webhook/echo \
//   -H 'Content-Type: application/json' \
//   -H 'X-Sender: alice' \
//   -d '{"message": "hello"}' \
//   '?urgent=true'
