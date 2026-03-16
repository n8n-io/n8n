import { defineWorkflow, webhook } from '@n8n/engine/sdk';
import { z } from 'zod';

export default defineWorkflow({
	name: '21 - Product Catalog',
	triggers: [
		webhook('/products', {
			method: 'GET',
			responseMode: 'lastNode',
			schema: {
				query: z.object({
					category: z.enum(['electronics', 'books', 'all']).optional(),
				}),
			},
		}),
	],
	async run(ctx) {
		const { query } = ctx.triggerData;
		const category = query.category ?? 'all';

		switch (category) {
			case 'electronics':
				return await ctx.step(
					{ name: 'Get Electronics', icon: 'cpu', color: '#3b82f6' },
					async () => {
						const res = await fetch('https://dummyjson.com/products/category/smartphones?limit=5');
						return (await res.json()) as { products: unknown[] };
					},
				);
			case 'books':
				return await ctx.step({ name: 'Get Books', icon: 'book', color: '#8b5cf6' }, async () => ({
					products: ['TypeScript Handbook', 'Clean Code', 'Design Patterns'],
					category,
				}));
			default:
				return await ctx.step(
					{ name: 'Get All Products', icon: 'list', color: '#10b981' },
					async () => {
						const res = await fetch(
							'https://dummyjson.com/products?limit=10&select=title,price,category',
						);
						return (await res.json()) as { products: unknown[] };
					},
				);
		}
	},
});
