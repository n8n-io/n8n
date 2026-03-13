/**
 * 06 - Error Handling
 *
 * Demonstrates the difference between retriable and non-retriable errors.
 * The first step simulates a retriable network error (ECONNREFUSED) that
 * succeeds on retry. The second step has a TypeError (non-retriable,
 * fails immediately without retry).
 */
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: '06 - Error Handling',
	triggers: [],
	async run(ctx) {
		// This step throws a retriable error — engine retries automatically
		await ctx.step(
			{
				name: 'Fetch With Retry',
				icon: 'refresh-cw',
				color: '#f97316',
				description: 'Simulates retriable ECONNREFUSED',
				retry: { maxAttempts: 3, baseDelay: 300 },
				timeout: 5000,
			},
			async () => {
				await new Promise((r) => setTimeout(r, 200));

				// Simulate retriable ECONNREFUSED on first attempt
				if (ctx.attempt < 2) {
					const err = new Error('connect ECONNREFUSED 127.0.0.1:9999');
					(err as unknown as Record<string, string>).code = 'ECONNREFUSED';
					throw err;
				}

				return { data: 'API response', attempts: ctx.attempt };
			},
		);

		// This step throws a non-retriable error (code bug) — fails immediately
		const transformed = await ctx.step(
			{
				name: 'Transform Response',
				icon: 'bug',
				color: '#ef4444',
				description: 'Intentional TypeError',
			},
			async () => {
				await new Promise((r) => setTimeout(r, 200));
				// TypeError: cannot read property of undefined — non-retriable
				const value = (undefined as any).property;
				return value;
			},
		);

		return transformed;
	},
});
