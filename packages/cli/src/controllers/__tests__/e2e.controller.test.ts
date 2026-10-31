import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import type { Profiler } from 'node:inspector';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mock } from 'vitest-mock-extended';

import type { License } from '@/license';

import { E2EController } from '../e2e.controller';

// The controller module exits the process outside E2E runs.
vi.mock('@/constants', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/constants')>()),
	inE2ETests: true,
}));

type CoverageResponse = { result?: Profiler.ScriptCoverage[]; boot?: Profiler.ScriptCoverage[] };

const createController = () =>
	new (E2EController as unknown as new (...args: unknown[]) => E2EController)(
		mock<License>(),
		...Array.from({ length: 16 }, () => mock()),
	);

// A named function so it can be found in the V8 coverage by name.
function coverageProbe() {
	return 1;
}

const probeCount = (scripts: Profiler.ScriptCoverage[] = []) =>
	scripts
		.flatMap((script) => script.functions)
		.filter((fn) => fn.functionName === 'coverageProbe')
		.reduce((sum, fn) => sum + fn.ranges[0].count, 0);

describe('E2EController per-spec backend coverage', () => {
	it('credits a function to each spec that runs it, not only to the first', async () => {
		const controller = createController();

		const boot: CoverageResponse = await controller.startCoverage();
		coverageProbe();
		const firstSpec: CoverageResponse = await controller.takeCoverage();

		const second: CoverageResponse = await controller.startCoverage();
		coverageProbe();
		coverageProbe();
		const secondSpec: CoverageResponse = await controller.takeCoverage();

		expect(probeCount(firstSpec.result)).toBe(1);
		expect(probeCount(secondSpec.result)).toBe(2);
		expect(boot.boot).toBeDefined();
		expect(second.boot).toBeUndefined();
	});

	it('writes every window to the NODE_V8_COVERAGE folder so the shard total stays complete', async () => {
		const dir = mkdtempSync(join(tmpdir(), 'e2e-coverage-'));
		vi.stubEnv('NODE_V8_COVERAGE', dir);
		try {
			const controller = createController();
			await controller.startCoverage();
			coverageProbe();
			await controller.takeCoverage();
			coverageProbe();
			await controller.startCoverage();
			coverageProbe();
			await controller.takeCoverage();

			const total = readdirSync(dir).reduce((sum, file) => {
				const { result } = JSON.parse(readFileSync(join(dir, file), 'utf8')) as CoverageResponse;
				return sum + probeCount(result);
			}, 0);
			expect(total).toBe(3);
		} finally {
			vi.unstubAllEnvs();
			rmSync(dir, { recursive: true, force: true });
		}
	});
});
