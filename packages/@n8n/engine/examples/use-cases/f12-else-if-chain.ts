/**
 * F12: Else-If Chain
 *
 * Demonstrates chained if/else if/else conditions for grading.
 * Score > 90 → Grade A, > 70 → Grade B, otherwise → Grade F.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F12 - Else If Chain',
	triggers: [
		webhook('/f12-else-if-chain', {
			method: 'POST',
			schema: {
				body: z.object({
					score: z.number().optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const input = await ctx.step(
			{ name: 'Parse Request', icon: 'settings', color: '#6b7280' },
			async () => {
				const { body } = ctx.triggerData;
				return { score: body.score ?? 0 };
			},
		);

		if (input.score > 90) {
			const result = await ctx.step(
				{ name: 'Grade A', icon: 'trophy', color: '#22c55e' },
				async () => {
					return { grade: 'A', score: input.score };
				},
			);
			return result;
		} else if (input.score > 70) {
			const result = await ctx.step(
				{ name: 'Grade B', icon: 'award', color: '#eab308' },
				async () => {
					return { grade: 'B', score: input.score };
				},
			);
			return result;
		} else {
			const result = await ctx.step(
				{ name: 'Grade F', icon: 'flag', color: '#ef4444' },
				async () => {
					return { grade: 'F', score: input.score };
				},
			);
			return result;
		}
	},
});
