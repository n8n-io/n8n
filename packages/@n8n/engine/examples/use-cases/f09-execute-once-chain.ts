/**
 * F09: Execute-Once Chain
 *
 * Demonstrates a simple two-step chain where each step runs once
 * (not per-item). Fetches config from an API, then sets a processed flag.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F09 - Execute Once Chain',
	triggers: [webhook('/f09-execute-once-chain', { method: 'POST' })],
	async run(ctx) {
		const config = await ctx.step({ name: 'HTTP Request' }, async () => {
			const res = await fetch('https://dummyjson.com/products/categories');
			return (await res.json()) as Record<string, unknown>;
		});

		const result = await ctx.step({ name: 'Set Fields' }, async () => {
			return { ...config, processed: true };
		});

		return result;
	},
});
