/**
 * F02: Three-Node Chain
 *
 * Demonstrates a three-step sequential chain: webhook trigger →
 * HTTP POST request → transform/set fields. Each step passes data
 * to the next via return values.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F02 - Three Node Chain',
	triggers: [webhook('/f02-three-node-chain', { method: 'POST' })],
	async run(ctx) {
		const httpResult = await ctx.step(
			{ name: 'HTTP Request', icon: 'globe', color: '#3b82f6' },
			async () => {
				const res = await fetch('https://dummyjson.com/posts/add', { method: 'POST' });
				const data = (await res.json()) as Record<string, unknown>;
				return data;
			},
		);

		const transformed = await ctx.step(
			{ name: 'Set Fields', icon: 'settings', color: '#6b7280' },
			async () => {
				return { key: 'val', source: httpResult };
			},
		);

		return transformed;
	},
});
