/**
 * Helper Functions Demo Workflow
 *
 * Demonstrates how to define reusable helper functions and shared
 * TypeScript types outside the `run()` method, making them available
 * to all steps. Shows function composition (helpers calling helpers),
 * typed interfaces, and URL building utilities.
 */
import { defineWorkflow } from '@n8n/engine/sdk';

// Helper functions — defined outside run(), available to all steps
function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '');
}

function buildUrl(base: string, path: string, params: Record<string, string>): string {
	const query = new URLSearchParams(params).toString();
	return `${base}/${path}${query ? '?' + query : ''}`;
}

interface Product {
	name: string;
	price: number;
	category: string;
}

function categorize(products: Product[]): Record<string, Product[]> {
	return products.reduce(
		(acc, p) => {
			const key = slugify(p.category); // Helper calling another helper
			acc[key] = acc[key] || [];
			acc[key].push(p);
			return acc;
		},
		{} as Record<string, Product[]>,
	);
}

export default defineWorkflow({
	name: '03 - Helper Functions',
	triggers: [],
	async run(ctx) {
		const products = await ctx.step(
			{
				name: 'Fetch All Products',
				icon: 'globe',
				color: '#3b82f6',
				description: 'Fetches products from API',
			},
			async () => {
				const url = buildUrl('https://dummyjson.com', 'products', { limit: '6' });
				const res = await fetch(url);
				const data = (await res.json()) as {
					products: Array<{ title: string; price: number; category: string }>;
				};
				// Map to our Product interface
				return data.products.map((p) => ({
					name: p.title,
					price: p.price,
					category: p.category,
				}));
			},
		);

		const organized = await ctx.step(
			{
				name: 'Categorize Products',
				icon: 'layers',
				color: '#8b5cf6',
				description: 'Groups by category',
			},
			async () => {
				return categorize(products);
			},
		);

		const report = await ctx.step(
			{
				name: 'Build Category Report',
				icon: 'bar-chart',
				color: '#22c55e',
				description: 'Generates category summary',
			},
			async () => {
				return Object.entries(organized).map(([category, items]) => ({
					category,
					slug: slugify(category),
					count: items.length,
					totalValue: items.reduce((sum, p) => sum + p.price, 0),
				}));
			},
		);

		return report;
	},
});
