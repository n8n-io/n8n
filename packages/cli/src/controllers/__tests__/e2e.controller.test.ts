import type { Profiler } from 'node:inspector';

import { E2EController } from '../e2e.controller';

// The controller module exits the process outside E2E runs.
vi.mock('@/constants', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/constants')>()),
	inE2ETests: true,
}));

const indexCoverage = (scripts: Profiler.ScriptCoverage[]) =>
	E2EController['indexCoverage'](scripts);
const deltaCoverage = (scripts: Profiler.ScriptCoverage[], baseline: Map<string, number>) =>
	E2EController['deltaCoverage'](scripts, baseline);

// The shape V8 reports for `class Repo { findA() {} findB() {} findC() {} }`:
// a module range that contains one range for each method.
const script = (
	url: string,
	counts: { module: number; findA: number; findB: number; findC: number },
): Profiler.ScriptCoverage => ({
	scriptId: url,
	url,
	functions: [
		{
			functionName: '',
			isBlockCoverage: true,
			ranges: [{ startOffset: 0, endOffset: 120, count: counts.module }],
		},
		...(['findA', 'findB', 'findC'] as const).map((name, i) => ({
			functionName: name,
			isBlockCoverage: true,
			ranges: [{ startOffset: 15 + i * 26, endOffset: 38 + i * 26, count: counts[name] }],
		})),
	],
});

const countsOf = (coverage: Profiler.ScriptCoverage) =>
	Object.fromEntries(
		coverage.functions.map((fn) => [fn.functionName || 'module', fn.ranges[0].count]),
	);

describe('E2EController coverage delta', () => {
	it('keeps functions that did not run in a script that loaded during the window', () => {
		const baseline = indexCoverage([]);
		const after = [script('file:///lazy.js', { module: 1, findA: 1, findB: 0, findC: 0 })];

		const [lazy] = deltaCoverage(after, baseline);

		expect(countsOf(lazy)).toEqual({ module: 1, findA: 1, findB: 0, findC: 0 });
	});

	it('reports only the calls made since the baseline', () => {
		const baseline = indexCoverage([
			script('file:///eager.js', { module: 1, findA: 0, findB: 3, findC: 0 }),
		]);
		const after = [script('file:///eager.js', { module: 1, findA: 2, findB: 3, findC: 0 })];

		const [eager] = deltaCoverage(after, baseline);

		expect(countsOf(eager)).toEqual({ module: 0, findA: 2, findB: 0, findC: 0 });
	});

	it('omits scripts that ran no code since the baseline', () => {
		const before = [script('file:///idle.js', { module: 1, findA: 4, findB: 0, findC: 0 })];

		expect(deltaCoverage(before, indexCoverage(before))).toEqual([]);
	});
});
