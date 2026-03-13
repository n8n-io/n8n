/**
 * Multi-Wait Pipeline Workflow
 *
 * Demonstrates multiple sleeps and `waitUntil` calls within a single
 * workflow. The transpiler converts each `ctx.sleep()` and `ctx.waitUntil()`
 * into first-class sleep graph nodes. Fetches a batch, processes it,
 * waits for a rate limit cooldown, sends results, waits until a specific
 * time, then verifies delivery. All prior step outputs are available
 * across sleep boundaries.
 */
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: '12 - Multi Wait Pipeline',
	triggers: [], // Manual trigger is implicit — every workflow can be triggered manually
	async run(ctx) {
		const batch = await ctx.step(
			{
				name: 'Fetch Data Batch',
				icon: 'download',
				color: '#3b82f6',
				description: 'Fetches a batch of recipes from DummyJSON',
			},
			async () => {
				const res = await fetch('https://dummyjson.com/recipes?limit=3&select=name,rating');
				const data = (await res.json()) as {
					recipes: Array<{ id: number; name: string; rating: number }>;
				};
				return { items: data.recipes, fetchedAt: Date.now() };
			},
		);

		const processed = await ctx.step(
			{
				name: 'Process Batch Items',
				icon: 'cog',
				color: '#8b5cf6',
				description: 'Transforms batch data',
			},
			async () => {
				return {
					result: batch.items.map((r) => ({ name: r.name, score: r.rating * 20 })),
					processedAt: Date.now(),
				};
			},
		);

		// Wait 3 seconds (rate limit cooldown)
		await ctx.sleep(3000);

		const sent = await ctx.step(
			{
				name: 'Send Processed Results',
				icon: 'upload',
				color: '#f97316',
				description: 'Sends results',
			},
			async () => {
				return { sent: true, sentAt: Date.now(), data: processed.result };
			},
		);

		// Wait until a specific time
		await ctx.waitUntil(new Date(Date.now() + 5000));

		const verified = await ctx.step(
			{
				name: 'Verify Delivery Status',
				icon: 'check-circle',
				color: '#22c55e',
				description: 'Confirms delivery',
			},
			async () => {
				return {
					verified: true,
					verifiedAt: Date.now(),
					totalDuration: Date.now() - batch.fetchedAt,
					sentData: sent.data,
				};
			},
		);

		return verified;
	},
});
