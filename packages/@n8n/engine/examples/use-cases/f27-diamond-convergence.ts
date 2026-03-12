/**
 * F27: Diamond Convergence
 *
 * Demonstrates the diamond pattern: IF branches that converge
 * back to a single merge point. Based on user tier (premium/basic),
 * different data is fetched, then a notification is sent regardless.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F27 - Diamond Convergence',
	triggers: [
		webhook('/f27-diamond-convergence', {
			method: 'POST',
			schema: {
				body: z.object({
					tier: z.string().optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const input = await ctx.step({ name: 'Parse Request' }, async () => {
			const { body } = ctx.triggerData;
			return { tier: body.tier ?? 'basic' };
		});

		let branchData: Record<string, unknown>;

		if (input.tier === 'premium') {
			branchData = await ctx.step({ name: 'Fetch Premium' }, async () => {
				const res = await fetch('https://dummyjson.com/products?limit=3&sortBy=price&order=desc');
				return (await res.json()) as Record<string, unknown>;
			});
		} else {
			branchData = await ctx.step({ name: 'Fetch Basic' }, async () => {
				const res = await fetch('https://dummyjson.com/products?limit=3&sortBy=price&order=asc');
				return (await res.json()) as Record<string, unknown>;
			});
		}

		// Convergence point: runs after either branch
		const notification = await ctx.step({ name: 'Send Notification' }, async () => {
			await fetch('https://dummyjson.com/posts/add', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tier: input.tier, data: branchData }),
			});
			return { notified: true, tier: input.tier };
		});

		return notification;
	},
});
