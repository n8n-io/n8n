/**
 * F05: Error Handling
 *
 * Demonstrates try/catch error handling around a step.
 * If the HTTP request step fails, the error handler step
 * captures and processes the error.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F05 - Error Handling',
	triggers: [webhook('/f05-error-handling', { method: 'POST' })],
	async run(ctx) {
		try {
			const result = await ctx.step({ name: 'HTTP Request' }, async () => {
				const res = await fetch('https://dummyjson.com/products?limit=5');
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return (await res.json()) as Record<string, unknown>;
			});
			return result;
		} catch (error) {
			const handled = await ctx.step({ name: 'Error Handler' }, async () => {
				return {
					error: true,
					message: error instanceof Error ? error.message : 'Unknown error',
				};
			});
			return handled;
		}
	},
});
