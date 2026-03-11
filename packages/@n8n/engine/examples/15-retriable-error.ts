/**
 * 15 - Retriable Error
 *
 * Demonstrates retriable errors (network-like failures). The step
 * simulates ECONNREFUSED errors that the engine automatically retries
 * with exponential backoff. Uses ctx.attempt to track retry count.
 */
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: '15 - Retriable Error',
	async run(ctx) {
		const result = await ctx.step(
			{
				name: 'Call Unreliable Service',
				icon: 'refresh-cw',
				color: '#f97316',
				description: 'Fails twice then succeeds',
				retry: { maxAttempts: 3, baseDelay: 200, maxDelay: 1000, jitter: false },
			},
			async () => {
				// ctx.attempt is 1 on first try, 2 on second, etc.
				if (ctx.attempt <= 2) {
					const err = new Error(`connect ECONNREFUSED 127.0.0.1:9999 (attempt ${ctx.attempt})`);
					(err as NodeJS.ErrnoException).code = 'ECONNREFUSED';
					throw err;
				}
				return { success: true, totalAttempts: ctx.attempt };
			},
		);

		const summary = await ctx.step(
			{
				name: 'Log Result',
				icon: 'file-text',
				color: '#22c55e',
				description: 'Logs retry summary',
			},
			async () => {
				return { ...result, message: `Succeeded after ${result.totalAttempts} attempts` };
			},
		);

		return summary;
	},
});
