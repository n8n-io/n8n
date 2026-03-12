/**
 * F07: Multi-Output
 *
 * Demonstrates a compare-datasets pattern with multiple outputs.
 * Two data sources are fetched, compared by ID, and the results
 * are split into three categories: only in A, only in B, and in both.
 */
import { defineWorkflow, webhook } from '@n8n/engine/sdk';

export default defineWorkflow({
	name: 'F07 - Multi Output',
	triggers: [webhook('/f07-multi-output', { method: 'POST' })],
	async run(ctx) {
		const dataA = await ctx.step({ name: 'Data A' }, async () => {
			return [
				{ id: 1, name: 'Alice' },
				{ id: 2, name: 'Bob' },
			];
		});

		const dataB = await ctx.step({ name: 'Data B' }, async () => {
			return [
				{ id: 2, name: 'Robert' },
				{ id: 3, name: 'Charlie' },
			];
		});

		const comparison = await ctx.step({ name: 'Compare Datasets' }, async () => {
			const idsA = new Set(dataA.map((item) => item.id));
			const idsB = new Set(dataB.map((item) => item.id));
			const onlyInA = dataA.filter((item) => !idsB.has(item.id));
			const onlyInB = dataB.filter((item) => !idsA.has(item.id));
			const inBoth = dataA.filter((item) => idsB.has(item.id));
			return { onlyInA, onlyInB, inBoth };
		});

		const onlyA = await ctx.step({ name: 'Only In A' }, async () => {
			return { items: comparison.onlyInA };
		});

		const onlyB = await ctx.step({ name: 'Only In B' }, async () => {
			return { items: comparison.onlyInB };
		});

		const both = await ctx.step({ name: 'In Both' }, async () => {
			return { items: comparison.inBoth };
		});

		return { onlyA, onlyB, both };
	},
});
