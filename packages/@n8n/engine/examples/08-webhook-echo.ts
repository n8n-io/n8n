/**
 * Webhook Echo Workflow
 *
 * Demonstrates webhook trigger handling with input validation and
 * echo response. Tests all four response modes (lastNode,
 * respondImmediately, respondWithNode, allData) and shows how to
 * access HTTP request data (body, headers, query params).
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

// Test each response mode by changing the second argument:
// 'lastNode' | 'respondImmediately' | 'respondWithNode' | 'allData'
export default defineWorkflow({
	name: 'Webhook Echo',
	triggers: [webhook('/echo', { method: 'POST', responseMode: 'respondWithNode' })],
	async run(ctx) {
		// ctx.triggerData contains the full HTTP request:
		// { body, headers, query, method, path }
		const { body, headers, query } = ctx.triggerData;

		const validated = await ctx.step(
			{
				name: 'Validate Request Body',
				icon: 'shield-check',
				color: '#eab308',
				description: 'Validates required fields',
			},
			async () => {
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

		const processed = await ctx.step(
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
