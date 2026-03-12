/**
 * F54: Sample Data
 *
 * Demonstrates a workflow with sample/pin data. The original v4
 * fixture shows trigger and node output data for testing. In v3,
 * the sample data concept is expressed as hardcoded return values.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F54 - Sample Data',
	triggers: [webhook('/f54-sample-data', { method: 'POST' })],
	async run(ctx) {
		const profile = await ctx.step({ name: 'Fetch Profile' }, async () => {
			const res = await fetch('https://dummyjson.com/users/1');
			const data = (await res.json()) as {
				id: number;
				firstName: string;
				email: string;
			};
			return { userId: data.id, name: data.firstName, email: data.email };
		});

		const formatted = await ctx.step({ name: 'Format Result' }, async () => {
			return { summary: profile.name };
		});

		return formatted;
	},
});
