/**
 * F05: Error Handling
 *
 * Demonstrates try/catch error handling inside a step.
 * The step itself catches the error and returns a structured
 * result indicating success or failure.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F05 - Error Handling',
	triggers: [webhook('/f05-error-handling', { method: 'POST' })],
	async run(ctx) {
		const result = await ctx.step(
			{
				name: 'Fetch With Error Handling',
				icon: 'globe',
				color: '#3b82f6',
				description: 'Fetches data with built-in error recovery',
			},
			async () => {
				try {
					const res = await fetch('https://dummyjson.com/products?limit=5');
					if (!res.ok) throw new Error(`HTTP ${res.status}`);
					const data = (await res.json()) as { products: unknown[] };
					return { success: true, products: data.products };
				} catch (error) {
					return {
						success: false,
						error: error instanceof Error ? error.message : 'Unknown error',
					};
				}
			},
		);

		return result;
	},
});
