/**
 * F03: IF Branching
 *
 * Demonstrates conditional branching based on trigger data.
 * The workflow checks a "status" field and routes to different
 * processing steps using native TypeScript if/else.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F03 - If Branching',
	triggers: [
		webhook('/f03-if-branching', {
			method: 'POST',
			schema: {
				body: z.object({
					status: z.string().optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const input = await ctx.step({ name: 'Parse Request' }, async () => {
			const { body } = ctx.triggerData;
			return { status: body.status ?? 'inactive' };
		});

		if (input.status === 'active') {
			const result = await ctx.step({ name: 'True Branch' }, async () => {
				return { branch: 'true', status: input.status };
			});
			return result;
		} else {
			const result = await ctx.step({ name: 'False Branch' }, async () => {
				return { branch: 'false', status: input.status };
			});
			return result;
		}
	},
});
