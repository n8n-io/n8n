/**
 * F04: Switch Routing
 *
 * Demonstrates switch/case routing based on trigger data.
 * The workflow checks a "destination" field and routes to
 * different handler steps for London, New York, or default.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F04 - Switch Routing',
	triggers: [
		webhook('/f04-switch-routing', {
			method: 'POST',
			schema: {
				body: z.object({
					destination: z.string().optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const input = await ctx.step({ name: 'Parse Request' }, async () => {
			const { body } = ctx.triggerData;
			return { destination: body.destination ?? 'unknown' };
		});

		switch (input.destination) {
			case 'London': {
				const result = await ctx.step({ name: 'London Handler' }, async () => {
					return { handler: 'London', destination: input.destination };
				});
				return result;
			}
			case 'New York': {
				const result = await ctx.step({ name: 'New York Handler' }, async () => {
					return { handler: 'New York', destination: input.destination };
				});
				return result;
			}
			default: {
				const result = await ctx.step({ name: 'Default Handler' }, async () => {
					return { handler: 'default', destination: input.destination };
				});
				return result;
			}
		}
	},
});
