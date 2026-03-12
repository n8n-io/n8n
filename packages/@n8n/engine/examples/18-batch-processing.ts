/**
 * Batch Processing Workflow
 *
 * Demonstrates the ctx.batch() API. Fetches a list of products from
 * DummyJSON, processes each product individually in parallel (calculating
 * a score), then generates a summary report.
 *
 * The batch step supports three `onItemFailure` strategies:
 *   - 'continue'        (default) — keep processing remaining items
 *   - 'fail-fast'       — stop immediately on first failure
 *   - 'abort-remaining' — cancel queued items but keep already-started ones
 */
import { defineWorkflow } from '@n8n/engine/sdk';

interface Product {
	id: number;
	title: string;
	price: number;
	rating: number;
}

interface ScoredProduct {
	id: number;
	title: string;
	score: number;
}

export default defineWorkflow({
	name: '18 - Batch Processing',
	triggers: [],
	async run(ctx) {
		const products = await ctx.step(
			{
				name: 'Fetch Products',
				icon: 'database',
				color: '#3b82f6',
				description: 'Fetches 10 products from DummyJSON',
			},
			async () => {
				const res = await fetch('https://dummyjson.com/products?limit=10');
				const data = (await res.json()) as { products: Product[] };
				return data.products;
			},
		);

		// Batch step: process each product in parallel.
		// onItemFailure options:
		//   'continue'        — process all items, collect successes and failures (default)
		//   'fail-fast'       — stop on first failure, reject immediately
		//   'abort-remaining' — cancel items not yet started, wait for in-flight ones
		const results = await ctx.batch(
			{
				name: 'Score Products',
				icon: 'zap',
				color: '#8b5cf6',
				description: 'Calculates price×rating score per product',
				onItemFailure: 'continue',
			},
			products,
			async (product) => ({
				id: product.id,
				title: product.title,
				score: Math.round(product.price * product.rating * 100) / 100,
			}),
		);

		return await ctx.step(
			{
				name: 'Generate Report',
				icon: 'file-text',
				color: '#22c55e',
				description: 'Summarizes batch results with top scores',
			},
			async () => {
				const succeeded = results.filter((r) => r.status === 'fulfilled');
				const failed = results.filter((r) => r.status === 'rejected');
				const scores = succeeded
					.map((r) => r.value)
					.filter((v): v is ScoredProduct => v !== undefined)
					.sort((a, b) => b.score - a.score);

				return {
					total: results.length,
					succeeded: succeeded.length,
					failed: failed.length,
					topScores: scores.slice(0, 3),
				};
			},
		);
	},
});
