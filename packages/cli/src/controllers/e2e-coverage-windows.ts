import { existsSync, readdirSync, readFileSync, renameSync } from 'node:fs';
import type { Profiler } from 'node:inspector';
import { join } from 'node:path';
import { takeCoverage } from 'node:v8';

/**
 * Splits this process's V8 coverage into windows, one for each E2E spec.
 *
 * `v8.takeCoverage()` makes Node write the call counts since the previous
 * take to the `NODE_V8_COVERAGE` folder and reset them. It uses the
 * connection that `NODE_V8_COVERAGE` opened at boot. A second inspector
 * session must call `Profiler.startPreciseCoverage` before it can take, and
 * that call drops the counts of module bodies that already ran.
 *
 * Each window stays in the folder, so the windows and the exit dump add up to
 * the whole run (the shard's Codecov input). Node omits code that did not run
 * in a window. The emitters restore it from the window in which the script
 * loaded (see `addMissingRootRanges` in the Playwright package).
 */
export class CoverageWindows {
	private taken = 0;

	/** Returns null when the process runs without NODE_V8_COVERAGE. */
	take(): { boot: boolean; result: Profiler.ScriptCoverage[] } | null {
		const dir = process.env.NODE_V8_COVERAGE;
		if (!dir) return null;

		// Node names the file `coverage-<pid>-<timestamp>-<thread>.json`. Rename it
		// at once, so that a take in the same millisecond cannot overwrite it.
		// Files from before this take (e.g. a previous process with the same pid)
		// are not part of this window.
		const prefix = `coverage-${process.pid}-`;
		// Node creates the folder on its first write.
		const before = new Set(existsSync(dir) ? readdirSync(dir) : []);
		takeCoverage();
		const written = readdirSync(dir).filter((f) => f.startsWith(prefix) && !before.has(f));

		const boot = this.taken === 0;
		const result: Profiler.ScriptCoverage[] = [];
		for (const file of written) {
			const window = join(dir, `window-${process.pid}-${Date.now()}-${++this.taken}.json`);
			renameSync(join(dir, file), window);
			const parsed = JSON.parse(readFileSync(window, 'utf8')) as {
				result: Profiler.ScriptCoverage[];
			};
			result.push(...parsed.result.filter(ranCode));
		}
		return { boot, result };
	}
}

const ranCode = (script: Profiler.ScriptCoverage) =>
	script.functions.some((fn) => fn.ranges.some((range) => range.count > 0));
