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
	name: 'Multi-Wait Pipeline',
	triggers: [], // Manual trigger is implicit — every workflow can be triggered manually
	async run(ctx) {
		const batch = await ctx.step(
			{
				name: 'Fetch Data Batch',
				icon: 'download',
				color: '#3b82f6',
				description: 'Retrieves batch items',
			},
			async () => {
				await new Promise((r) => setTimeout(r, 300)); // Simulate batch fetch
				return { items: [1, 2, 3], fetchedAt: Date.now() };
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
				await new Promise((r) => setTimeout(r, 250)); // Simulate batch processing
				return { result: batch.items.map((i) => i * 10), processedAt: Date.now() };
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
				await new Promise((r) => setTimeout(r, 200)); // Simulate sending results
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
				await new Promise((r) => setTimeout(r, 350)); // Simulate delivery verification
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
