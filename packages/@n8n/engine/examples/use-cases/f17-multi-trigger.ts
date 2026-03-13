/**
 * F17: Multi-Trigger
 *
 * Demonstrates a workflow with multiple independent triggers.
 * The original v4 fixture had 3 triggers: Orders webhook, Returns
 * webhook, and a Daily Cleanup schedule. In v3, we use a single
 * webhook that routes internally based on the request body.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F17 - Multi Trigger (Not supported yet)',
	// --- UNSUPPORTED: Multiple trigger convergence + Schedule triggers ---
	// The original workflow has 3 independent triggers:
	// 1. Orders Webhook (POST /orders)
	// 2. Returns Webhook (POST /returns)
	// 3. Daily Cleanup (schedule trigger, runs daily)
	// The v3 engine supports multiple webhook triggers but not schedule
	// triggers. Using a single webhook with routing instead.
	// Requires: schedule() trigger primitive and mixed trigger type support.
	//
	// triggers: [
	//   webhook('/orders', { method: 'POST' }),
	//   webhook('/returns', { method: 'POST' }),
	//   schedule('0 0 * * *'),  // Daily cleanup
	// ],
	//
	// --- END UNSUPPORTED ---
	triggers: [
		webhook('/f17-multi-trigger', {
			method: 'POST',
			schema: {
				body: z.object({
					type: z.string().optional(),
					id: z.string().optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const input = await ctx.step(
			{ name: 'Parse Request', icon: 'settings', color: '#6b7280' },
			async () => {
				const { body } = ctx.triggerData;
				return { type: body.type ?? 'order', id: body.id ?? 'unknown' };
			},
		);

		switch (input.type) {
			case 'order': {
				const result = await ctx.step(
					{ name: 'Process Order', icon: 'zap', color: '#8b5cf6' },
					async () => {
						return { orderId: input.id, processed: true };
					},
				);
				return result;
			}
			case 'return': {
				const result = await ctx.step(
					{ name: 'Process Return', icon: 'zap', color: '#8b5cf6' },
					async () => {
						return { returnId: input.id, processed: true };
					},
				);
				return result;
			}
			case 'cleanup': {
				const result = await ctx.step(
					{ name: 'Run Cleanup', icon: 'cog', color: '#6b7280' },
					async () => {
						const res = await fetch('https://dummyjson.com/posts/add', { method: 'POST' });
						return { cleanup: res.ok };
					},
				);
				return result;
			}
			default:
				return { error: 'Unknown type', type: input.type };
		}
	},
});
