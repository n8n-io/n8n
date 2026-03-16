/**
 * F28: Nested Control Flow
 *
 * Demonstrates nested switch and if/else inside a case. Routes
 * based on order type, and within the 'express' case, further
 * checks urgency.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F28 - Nested Control Flow',
	triggers: [
		webhook('/f28-nested-control-flow', {
			method: 'POST',
			schema: {
				body: z.object({
					orderType: z.string().optional(),
					isUrgent: z.boolean().optional(),
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
					orderType: body.orderType ?? 'standard',
					isUrgent: body.isUrgent ?? false,
				};
			},
		);

		switch (input.orderType) {
			case 'express': {
				if (input.isUrgent) {
					const result = await ctx.step(
						{ name: 'Rush Delivery', icon: 'zap', color: '#ef4444' },
						async () => {
							await fetch('https://dummyjson.com/posts/add', {
								method: 'POST',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({ urgent: true }),
							});
							return { delivery: 'rush', urgent: true };
						},
					);
					return result;
				} else {
					const result = await ctx.step(
						{ name: 'Standard Express', icon: 'send', color: '#f97316' },
						async () => {
							return { delivery: 'express', urgent: false };
						},
					);
					return result;
				}
			}
			case 'standard': {
				const result = await ctx.step(
					{ name: 'Standard Delivery', icon: 'send', color: '#22c55e' },
					async () => {
						return { delivery: 'standard' };
					},
				);
				return result;
			}
			default: {
				const result = await ctx.step(
					{ name: 'Unknown Order', icon: 'flag', color: '#eab308' },
					async () => {
						return { delivery: 'unknown', orderType: input.orderType };
					},
				);
				return result;
			}
		}
	},
});
