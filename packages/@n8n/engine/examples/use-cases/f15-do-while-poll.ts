/**
 * F15: Do-While Poll
 *
 * Demonstrates a polling loop pattern. Repeatedly checks a status
 * endpoint until a condition is met or max retries are reached,
 * with a sleep between checks.
 *
 * Note: This workflow does not use batch processing — the original
 * UNSUPPORTED block was a misattribution. The polling pattern uses
 * a regular step with a loop and setTimeout-based delay.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F15 - Do While Poll',
	triggers: [webhook('/f15-do-while-poll', { method: 'POST' })],
	async run(ctx) {
		const result = await ctx.step(
			{ name: 'Poll Status', icon: 'clock', color: '#3b82f6', description: 'Poll until ready' },
			async () => {
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
			},
		);

		return result;
	},
});
