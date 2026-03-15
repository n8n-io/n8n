/**
 * Light Test Workflow — minimal CPU, fast execution
 *
 * 4 sequential steps with lightweight work.
 * Designed for throughput testing — how many executions/sec can
 * the engine sustain with minimal per-step overhead.
 *
 * No HTTP requests, no heavy computation.
 */
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Light Test',
	triggers: [],
	async run(ctx) {
		// Step 1: Generate small dataset
		const data = await ctx.step(
			{ name: 'Generate Data', icon: 'database', color: '#3b82f6' },
			async () => {
				const items = [];
				for (let i = 0; i < 100; i++) {
					items.push({ id: i, value: Math.random() * 100, label: `item-${i}` });
				}
				return items;
			},
		);

		// Step 2: Transform
		const transformed = await ctx.step(
			{ name: 'Transform', icon: 'zap', color: '#8b5cf6' },
			async () =>
				data
					.filter((item) => item.value > 50)
					.map((item) => ({ ...item, doubled: item.value * 2 })),
		);

		// Step 3: Aggregate
		const aggregated = await ctx.step(
			{ name: 'Aggregate', icon: 'sigma', color: '#f97316' },
			async () => ({
				count: transformed.length,
				totalValue: transformed.reduce((sum, item) => sum + item.value, 0),
				avgValue: transformed.reduce((sum, item) => sum + item.value, 0) / transformed.length,
			}),
		);

		// Step 4: Output
		const output = await ctx.step({ name: 'Output', icon: 'flag', color: '#22c55e' }, async () => ({
			...aggregated,
			completedAt: Date.now(),
		}));

		return output;
	},
});
