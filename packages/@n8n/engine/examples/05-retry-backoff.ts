/**
 * 05 - Retry with Backoff
 *
 * Demonstrates automatic retry with exponential backoff. The step
 * fails on the first 2 attempts and succeeds on the 3rd. Uses
 * ctx.attempt to track retry count (provided by the engine, persisted
 * across retries). Shows how transient failures are handled automatically.
 */
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: '05 - Retry with Backoff',
	triggers: [],
	async run(ctx) {
		const result = await ctx.step(
			{
				name: 'Call Flaky API',
				icon: 'refresh-cw',
				color: '#f97316',
				description: 'Retries on failure with backoff',
				retry: { maxAttempts: 3, baseDelay: 500, maxDelay: 5000, jitter: false },
				timeout: 10000,
			},
			async () => {
				await new Promise((r) => setTimeout(r, 200));

				// ctx.attempt is 1 on first try, 2 on second, etc.
				if (ctx.attempt < 3) {
					throw new Error(`Service temporarily unavailable (attempt ${ctx.attempt}/3)`);
				}

				return {
					success: true,
					data: 'API response after retries',
					attemptsNeeded: ctx.attempt,
				};
			},
		);

		const summary = await ctx.step(
			{
				name: 'Summarize Retry Result',
				icon: 'bar-chart',
				color: '#22c55e',
				description: 'Summary of retry attempts',
			},
			async () => {
				await new Promise((r) => setTimeout(r, 100));
				return {
					...result,
					message: `Succeeded after ${result.attemptsNeeded} attempts`,
				};
			},
		);

		return summary;
	},
});
