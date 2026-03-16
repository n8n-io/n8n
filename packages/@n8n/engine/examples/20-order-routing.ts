import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: '20 - Order Routing',
	triggers: [
		webhook('/orders', {
			method: 'POST',
			responseMode: 'lastNode',
			schema: {
				body: z.object({
					type: z.enum(['order', 'inquiry']),
					id: z.string().optional(),
					amount: z.number().optional(),
					message: z.string().optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const { body } = ctx.triggerData;

		if (body.type === 'order') {
			return await ctx.step(
				{ name: 'Process Order', icon: 'shopping-cart', color: '#10b981' },
				async () => ({
					status: 'processed',
					orderId: body.id,
					total: (body.amount ?? 0) * 1.1,
				}),
			);
		} else {
			return await ctx.step(
				{ name: 'Handle Inquiry', icon: 'message-circle', color: '#f59e0b' },
				async () => ({
					status: 'inquiry_received',
					message: `We received your inquiry: ${body.message}`,
				}),
			);
		}
	},
});
