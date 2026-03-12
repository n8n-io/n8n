/**
 * F30: Complex Expressions
 *
 * Demonstrates complex computed values in step parameters.
 * Uses template literals, date formatting, and dynamic URL
 * construction — all expressed as native TypeScript.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: 'F30 - Complex Expressions',
	triggers: [
		webhook('/f30-complex-expressions', {
			method: 'POST',
			schema: {
				body: z.object({
					baseUrl: z.string().optional(),
					id: z.string().optional(),
					name: z.string().optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const input = await ctx.step({ name: 'Parse Request' }, async () => {
			const { body } = ctx.triggerData;
			return {
				baseUrl: body.baseUrl ?? 'https://dummyjson.com',
				id: body.id ?? '42',
				name: body.name ?? 'Test',
			};
		});

		const config = await ctx.step({ name: 'HTTP Request' }, async () => {
			const res = await fetch(`${input.baseUrl}/products/categories`, {
				headers: { 'X-Timestamp': new Date().toISOString() },
			});
			return (await res.json()) as Record<string, unknown>;
		});

		const updated = await ctx.step({ name: 'Update Record' }, async () => {
			const res = await fetch(`https://dummyjson.com/products/${input.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: input.name,
					updatedAt: new Date().toISOString(),
					config,
				}),
			});
			return (await res.json()) as Record<string, unknown>;
		});

		return updated;
	},
});
