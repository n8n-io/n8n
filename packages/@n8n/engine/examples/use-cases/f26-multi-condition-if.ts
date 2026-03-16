/**
 * F26: Multi-Condition IF
 *
 * Demonstrates an IF condition with multiple criteria combined with AND.
 * Checks both status === 'active' AND priority > 5 before sending
 * a notification.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F26 - Multi Condition If',
	triggers: [
		webhook('/f26-multi-condition-if', {
			method: 'POST',
			schema: {
				body: z.object({
					status: z.string().optional(),
					priority: z.number().optional(),
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
					status: body.status ?? 'inactive',
					priority: body.priority ?? 0,
				};
			},
		);

		if (input.status === 'active' && input.priority > 5) {
			const result = await ctx.step(
				{ name: 'Send Notification', icon: 'send', color: '#f97316' },
				async () => {
					const res = await fetch('https://dummyjson.com/posts/add', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							status: input.status,
							priority: input.priority,
						}),
					});
					return { notified: res.ok };
				},
			);
			return result;
		} else {
			const result = await ctx.step(
				{ name: 'Skip Notification', icon: 'filter', color: '#6b7280' },
				async () => {
					return {
						skipped: true,
						reason: 'Conditions not met',
						status: input.status,
						priority: input.priority,
					};
				},
			);
			return result;
		}
	},
});
