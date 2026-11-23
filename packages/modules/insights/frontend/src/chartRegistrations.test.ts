import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Chart.js is not registered at startup. The `Bar` and `Line` components of `vue-chartjs`
 * register only their own controller, so each chart component must call `registerCharts()`
 * before its chart mounts. A chart without the call throws `"category" is not a registered
 * scale` only when it renders, which no other unit test sees. This test reads the source files
 * and fails when a chart component misses the call.
 */
const srcDir = join(process.cwd(), 'src');

const walk = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return walk(path);
		return entry.name.endsWith('.vue') ? [path] : [];
	});

const importsVueChartjsValue = (source: string) =>
	[...source.matchAll(/import\s+([^;]*?)\s+from\s+['"]vue-chartjs['"]/g)].some(([, clause]) => {
		if (/^type\s/.test(clause)) return false;
		const specifiers = clause.replace(/[{}]/g, '').split(',');
		return specifiers.some((specifier) => specifier.trim() && !/^type\s/.test(specifier.trim()));
	});

const chartComponents = walk(srcDir)
	.filter((file) => importsVueChartjsValue(readFileSync(file, 'utf8')))
	.map((file) => relative(process.cwd(), file));

describe('chart components', () => {
	it('finds the chart components', () => {
		// Guards against a vacuous pass, for example when the file walk finds nothing.
		expect(chartComponents).toEqual(
			expect.arrayContaining([
				'src/components/charts/InsightsChartAverageRuntime.vue',
				'src/components/charts/InsightsChartFailed.vue',
				'src/components/charts/InsightsChartFailureRate.vue',
				'src/components/charts/InsightsChartTimeSaved.vue',
				'src/components/charts/InsightsChartTotal.vue',
			]),
		);
	});

	it.each(chartComponents)('%s imports registerCharts and calls it', (file) => {
		const source = readFileSync(join(process.cwd(), file), 'utf8');

		expect(source).toContain("import { registerCharts } from '@n8n/composables/registerCharts';");
		expect(source).toMatch(/^registerCharts\(\);$/m);
	});
});
