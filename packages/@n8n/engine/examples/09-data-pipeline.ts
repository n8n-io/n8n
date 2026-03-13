/**
 * Data Pipeline Workflow (10 Steps)
 *
 * Demonstrates a multi-step data processing pipeline for benchmarking.
 * Fetches products from DummyJSON, then filters, maps, sorts, slices,
 * enriches, formats, joins, validates, and finalizes them through
 * 10 sequential steps.
 */
import { defineWorkflow } from '@n8n/engine/sdk';

interface RawProduct {
	id: number;
	title: string;
	price: number;
	rating: number;
	category: string;
}

export default defineWorkflow({
	name: '09 - Data Pipeline',
	triggers: [], // Manual trigger is implicit — every workflow can be triggered manually
	async run(ctx) {
		const raw = await ctx.step(
			{
				name: 'Fetch 100 Products',
				icon: 'database',
				color: '#3b82f6',
				description: 'Fetches products from DummyJSON',
			},
			async () => {
				const res = await fetch(
					'https://dummyjson.com/products?limit=100&select=title,price,rating,category',
				);
				const data = (await res.json()) as { products: RawProduct[] };
				return data.products;
			},
		);

		const filtered = await ctx.step(
			{
				name: 'Filter Rating > 4.0',
				icon: 'filter',
				color: '#8b5cf6',
				description: 'Keeps highly-rated products',
			},
			async () => {
				return raw.filter((item) => item.rating > 4.0);
			},
		);

		const mapped = await ctx.step(
			{
				name: 'Compute Score',
				icon: 'zap',
				color: '#8b5cf6',
				description: 'Calculates price-to-rating score',
			},
			async () => {
				return filtered.map((item) => ({
					...item,
					score: Math.round(item.price * item.rating * 100) / 100,
				}));
			},
		);

		const sorted = await ctx.step(
			{
				name: 'Sort by Score DESC',
				icon: 'arrow-up-down',
				color: '#8b5cf6',
				description: 'Sorts highest to lowest',
			},
			async () => {
				return [...mapped].sort((a, b) => b.score - a.score);
			},
		);

		const top10 = await ctx.step(
			{
				name: 'Take Top 10',
				icon: 'trophy',
				color: '#f97316',
				description: 'Selects top entries',
			},
			async () => {
				return sorted.slice(0, 10);
			},
		);

		const enriched = await ctx.step(
			{
				name: 'Add Rankings',
				icon: 'award',
				color: '#f97316',
				description: 'Assigns rank numbers',
			},
			async () => {
				return top10.map((item, index) => ({ ...item, rank: index + 1 }));
			},
		);

		const formatted = await ctx.step(
			{
				name: 'Format as Strings',
				icon: 'file-text',
				color: '#6b7280',
				description: 'Converts to readable format',
			},
			async () => {
				return enriched.map(
					(item) =>
						`#${item.rank}: ${item.title} — $${item.price} (rating: ${item.rating}, score: ${item.score})`,
				);
			},
		);

		const joined = await ctx.step(
			{
				name: 'Join Into Report',
				icon: 'file-plus',
				color: '#6b7280',
				description: 'Combines into report',
			},
			async () => {
				return { report: formatted.join('\n'), count: formatted.length };
			},
		);

		const validated = await ctx.step(
			{
				name: 'Validate Report',
				icon: 'check-circle',
				color: '#22c55e',
				description: 'Checks not empty',
			},
			async () => {
				if (joined.count === 0) throw new Error('Empty report');
				return { valid: true, ...joined };
			},
		);

		const final = await ctx.step(
			{
				name: 'Finalize Output',
				icon: 'flag',
				color: '#22c55e',
				description: 'Adds completion timestamp',
			},
			async () => {
				return { ...validated, completedAt: Date.now() };
			},
		);

		return final;
	},
});
