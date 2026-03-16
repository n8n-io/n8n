/**
 * Stress Test Workflow — CPU-bound, no external dependencies
 *
 * Designed to stress the engine with many sequential CPU-intensive steps.
 * Each step does heavy computation (sorting, hashing, matrix math).
 * No HTTP requests, no external APIs. Pure engine load.
 *
 * 10 sequential steps with increasing workload.
 */
import { defineWorkflow } from '@n8n/engine/sdk';

function generateData(size: number) {
	const data = [];
	for (let i = 0; i < size; i++) {
		data.push(Math.random() * 10000);
	}
	return data;
}

function heavyCompute(data: number[]) {
	const sorted = [...data].sort((a, b) => a - b);
	const sum = sorted.reduce((acc, val) => acc + val, 0);
	return { sum, top10: sorted.slice(0, 10), mean: sum / sorted.length };
}

function hashWork(input: string, iterations: number) {
	let val = input;
	for (let i = 0; i < iterations; i++) {
		let hash = 0;
		for (let j = 0; j < val.length; j++) {
			const char = val.charCodeAt(j);
			hash = (hash << 5) - hash + char;
			hash = hash & hash;
		}
		val = Math.abs(hash).toString(36) + val.slice(0, 50);
	}
	return val;
}

function matrixMultiply(size: number) {
	const a: number[][] = [];
	const b: number[][] = [];
	const c: number[][] = [];
	for (let i = 0; i < size; i++) {
		a[i] = [];
		b[i] = [];
		c[i] = [];
		for (let j = 0; j < size; j++) {
			a[i][j] = Math.random();
			b[i][j] = Math.random();
			c[i][j] = 0;
		}
	}
	for (let i = 0; i < size; i++) {
		for (let j = 0; j < size; j++) {
			for (let k = 0; k < size; k++) {
				c[i][j] += a[i][k] * b[k][j];
			}
		}
	}
	return c;
}

export default defineWorkflow({
	name: 'Stress Test',
	triggers: [],
	async run(ctx) {
		// Step 1: Generate large dataset
		const data1 = await ctx.step(
			{ name: 'Generate 100k Numbers', icon: 'database', color: '#3b82f6' },
			async () => generateData(100_000),
		);

		// Step 2: Sort and reduce
		const stats1 = await ctx.step(
			{ name: 'Sort & Reduce', icon: 'zap', color: '#3b82f6' },
			async () => heavyCompute(data1),
		);

		// Step 3: Generate another dataset
		const data2 = await ctx.step(
			{ name: 'Generate 100k More', icon: 'database', color: '#8b5cf6' },
			async () => generateData(100_000),
		);

		// Step 4: Sort and reduce second set
		const stats2 = await ctx.step(
			{ name: 'Sort & Reduce 2', icon: 'zap', color: '#8b5cf6' },
			async () => heavyCompute(data2),
		);

		// Step 5: Hash 1000 strings (500 iterations each)
		const hashed = await ctx.step(
			{ name: 'Hash 1000 Strings', icon: 'lock', color: '#f97316' },
			async () => {
				const results = [];
				for (let i = 0; i < 1000; i++) {
					results.push(hashWork(`input-${i}`, 500));
				}
				return { count: results.length, sample: results[0] };
			},
		);

		// Step 6: Hash again (double work)
		const rehashed = await ctx.step(
			{ name: 'Rehash Strings', icon: 'lock', color: '#f97316' },
			async () => {
				const results = [];
				for (let i = 0; i < 1000; i++) {
					results.push(hashWork(`round2-${i}`, 500));
				}
				return { count: results.length, sample: results[0] };
			},
		);

		// Step 7: Matrix 80x80
		const matrix1 = await ctx.step(
			{ name: 'Matrix 80×80', icon: 'grid', color: '#22c55e' },
			async () => {
				const m = matrixMultiply(80);
				return { size: 80, checksum: m[0][0] + m[79][79] };
			},
		);

		// Step 8: Matrix 100x100
		const matrix2 = await ctx.step(
			{ name: 'Matrix 100×100', icon: 'grid', color: '#22c55e' },
			async () => {
				const m = matrixMultiply(100);
				return { size: 100, checksum: m[0][0] + m[99][99] };
			},
		);

		// Step 9: Aggregate all results
		const aggregated = await ctx.step(
			{ name: 'Aggregate Results', icon: 'sigma', color: '#ef4444' },
			async () => ({
				dataSums: stats1.sum + stats2.sum,
				hashCount: hashed.count + rehashed.count,
				matrixOps: 80 ** 3 + 100 ** 3,
				checksums: [matrix1.checksum, matrix2.checksum],
			}),
		);

		// Step 10: Final validation
		const final = await ctx.step(
			{ name: 'Finalize', icon: 'flag', color: '#ef4444' },
			async () => ({
				...aggregated,
				valid: aggregated.dataSums > 0 && aggregated.hashCount === 2000,
				completedAt: Date.now(),
				stepCount: 10,
			}),
		);

		return final;
	},
});
