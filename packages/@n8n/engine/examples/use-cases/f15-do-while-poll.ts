/**
 * F15: Do-While Poll
 *
 * Demonstrates a polling loop pattern. Repeatedly checks a status
 * endpoint until a condition is met or max retries are reached,
 * with a sleep between checks.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F15 - Do While Poll (Not supported yet)',
	triggers: [webhook('/f15-do-while-poll', { method: 'POST' })],
	async run(ctx) {
		// --- UNSUPPORTED: Batch step (3-arg ctx.step) ---
		// The source workflow uses batch() for polling.
		// Using a loop with ctx.sleep() between iterations instead.
		// --- END UNSUPPORTED ---

		const result = await ctx.step({ name: 'Poll Status' }, async () => {
			const maxRetries = 5;
			let attempt = 0;
			let status = 'pending';

			while (status === 'pending' && attempt < maxRetries) {
				const res = await fetch('https://dummyjson.com/test');
				const data = (await res.json()) as { status: string };
				status = data.status;
				attempt++;

				if (status === 'pending' && attempt < maxRetries) {
					await new Promise((resolve) => setTimeout(resolve, 1000));
				}
			}

			return { status, attempts: attempt };
		});

		return result;
	},
});
