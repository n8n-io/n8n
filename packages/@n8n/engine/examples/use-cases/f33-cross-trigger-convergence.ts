/**
 * F33: Cross-Trigger Convergence
 *
 * Demonstrates a workflow where multiple triggers converge to the
 * same processing logic. The original v4 fixture has both a webhook
 * and a schedule trigger feeding into the same "Process Data" step.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F33 - Cross Trigger Convergence (Not supported yet)',
	// --- UNSUPPORTED: Schedule trigger + Multiple trigger convergence ---
	// The original workflow has two triggers:
	// 1. Orders Webhook (POST /orders)
	// 2. Hourly Check (schedule trigger, runs every hour)
	// Both feed into the same "Process Data" step.
	// The v3 engine does not yet support cron/schedule triggers or
	// mixed trigger type convergence.
	// Using a single webhook trigger as a substitute.
	// Requires: schedule() trigger primitive.
	//
	// triggers: [
	//   webhook('/orders', { method: 'POST' }),
	//   schedule('0 * * * *'),  // Every hour
	// ],
	//
	// --- END UNSUPPORTED ---
	triggers: [
		webhook('/f33-cross-trigger-convergence', {
			method: 'POST',
			schema: {
				body: z.object({
					source: z.string().optional(),
					data: z.string().optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const input = await ctx.step(
			{ name: 'Parse Request', icon: 'settings', color: '#6b7280' },
			async () => {
				const { body } = ctx.triggerData;
				return {
					source: body.source ?? 'webhook',
					data: body.data ?? 'default',
				};
			},
		);

		const processed = await ctx.step(
			{ name: 'Process Data', icon: 'zap', color: '#8b5cf6' },
			async () => {
				const res = await fetch('https://dummyjson.com/products/search?q=phone', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ source: input.source, data: input.data }),
				});
				return (await res.json()) as Record<string, unknown>;
			},
		);

		return processed;
	},
});
