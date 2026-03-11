/**
 * Data Pipeline Workflow (10 Steps)
 *
 * Demonstrates a multi-step data processing pipeline for benchmarking.
 * Generates 100 random items, then filters, maps, sorts, slices, enriches,
 * formats, joins, validates, and finalizes them through 10 sequential steps.
 */
import { defineWorkflow } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'Data Pipeline (10 steps)',
	triggers: [], // Manual trigger is implicit — every workflow can be triggered manually
	async run(ctx) {
		const raw = await ctx.step(
			{
				name: 'Generate 100 Records',
				icon: 'database',
				color: '#3b82f6',
				description: 'Creates random dataset',
			},
			async () => {
				await new Promise((r) => setTimeout(r, 200)); // Simulate data generation
				return Array.from({ length: 100 }, (_, i) => ({ id: i, value: Math.random() }));
			},
		);

		const filtered = await ctx.step(
			{
				name: 'Filter Values > 0.5',
				icon: 'filter',
				color: '#8b5cf6',
				description: 'Removes below threshold',
			},
			async () => {
				await new Promise((r) => setTimeout(r, 150)); // Simulate filtering
				return raw.filter((item) => item.value > 0.5);
			},
		);

		const mapped = await ctx.step(
			{
				name: 'Double Each Value',
				icon: 'zap',
				color: '#8b5cf6',
				description: 'Multiplies by 2',
			},
			async () => {
				await new Promise((r) => setTimeout(r, 100)); // Simulate mapping
				return filtered.map((item) => ({ ...item, doubled: item.value * 2 }));
			},
		);

		const sorted = await ctx.step(
			{
				name: 'Sort by Value DESC',
				icon: 'arrow-up-down',
				color: '#8b5cf6',
				description: 'Sorts highest to lowest',
			},
			async () => {
				await new Promise((r) => setTimeout(r, 120)); // Simulate sorting
				return [...mapped].sort((a, b) => b.doubled - a.doubled);
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
				await new Promise((r) => setTimeout(r, 100)); // Simulate slicing
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
				await new Promise((r) => setTimeout(r, 250)); // Simulate enrichment (external lookup)
				return top10.map((item) => ({ ...item, rank: top10.indexOf(item) + 1 }));
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
				await new Promise((r) => setTimeout(r, 100)); // Simulate formatting
				return enriched.map(
					(item) => `#${item.rank}: id=${item.id} value=${item.doubled.toFixed(3)}`,
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
				await new Promise((r) => setTimeout(r, 100)); // Simulate joining
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
				await new Promise((r) => setTimeout(r, 150)); // Simulate validation
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
				await new Promise((r) => setTimeout(r, 200)); // Simulate finalization
				return { ...validated, completedAt: Date.now() };
			},
		);

		return final;
	},
});
