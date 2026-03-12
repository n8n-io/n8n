/**
 * F01: Simple Chain
 *
 * Demonstrates the simplest workflow pattern: a webhook trigger
 * followed by a single HTTP request step. Translates the v4 SDK
 * pattern of ManualTrigger → HTTP Request into a webhook-triggered
 * workflow with a fetch() call.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F01 - Simple Chain',
	triggers: [webhook('/f01-simple-chain', { method: 'POST' })],
	async run(ctx) {
		const result = await ctx.step({ name: 'HTTP Request' }, async () => {
			const res = await fetch('https://dummyjson.com/products?limit=5');
			return { status: res.status, ok: res.ok };
		});

		return result;
	},
});
