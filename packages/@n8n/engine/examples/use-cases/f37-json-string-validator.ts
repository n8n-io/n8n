/**
 * F37: JSON String Validator
 *
 * Demonstrates a webhook that receives a JSON string in the body,
 * validates whether it's valid JSON, and responds with the result.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F37 - Json String Validator',
	triggers: [
		webhook('/f37-json-string-validator', {
			method: 'POST',
			responseMode: 'respondWithNode',
			schema: {
				body: z.object({
					jsonString: z.string().optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const validation = await ctx.step({ name: 'Validate JSON String' }, async () => {
			const { body } = ctx.triggerData;

			if (!body.jsonString || typeof body.jsonString !== 'string') {
				return { valid: false, error: "Input 'jsonString' is missing or not a string." };
			}

			try {
				JSON.parse(body.jsonString);
				return { valid: true };
			} catch (e) {
				return { valid: false, error: (e as Error).message };
			}
		});

		await ctx.step({ name: 'Respond with Result' }, async () => {
			await ctx.respondToWebhook({
				statusCode: 200,
				headers: { 'Content-Type': 'application/json' },
				body: validation,
			});
			return { responded: true };
		});
	},
});
