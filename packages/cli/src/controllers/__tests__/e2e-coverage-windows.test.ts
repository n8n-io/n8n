import { execFileSync } from 'node:child_process';
import type { Profiler } from 'node:inspector';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

type Window = { boot: boolean; result: Profiler.ScriptCoverage[] } | null;

// NODE_V8_COVERAGE only takes effect when a process starts, so the windows are
// taken in a child Node process that loads the module from source.
const MODULE = resolve(__dirname, '../e2e-coverage-windows.ts');

const CHILD = `
import { CoverageWindows } from ${JSON.stringify(MODULE)};
function coverageProbe() { return 1; }
const windows = new CoverageWindows();
coverageProbe();
const boot = windows.take();
coverageProbe();
const firstSpec = windows.take();
coverageProbe();
windows.take(); // the next spec's start
coverageProbe();
coverageProbe();
const secondSpec = windows.take();
coverageProbe();
console.log(JSON.stringify({ boot, firstSpec, secondSpec }));
`;

const probe = (scripts: Profiler.ScriptCoverage[] = []) =>
	scripts
		.flatMap((script) => script.functions)
		.filter((fn) => fn.functionName === 'coverageProbe')
		.reduce((sum, fn) => sum + fn.ranges[0].count, 0);

const rootCount = (scripts: Profiler.ScriptCoverage[] = [], url: string) =>
	scripts
		.find((script) => script.url.endsWith(url))
		?.functions.find((fn) => fn.functionName === '' && fn.ranges[0].startOffset === 0)?.ranges[0]
		.count;

describe('CoverageWindows', () => {
	let dir: string;
	let run: Record<'boot' | 'firstSpec' | 'secondSpec', Window>;

	beforeAll(() => {
		dir = mkdtempSync(join(tmpdir(), 'e2e-coverage-'));
		const child = join(dir, 'child.mjs');
		writeFileSync(child, CHILD);
		const coverageDir = join(dir, 'cov');
		const out = execFileSync(process.execPath, [child], {
			env: {
				...process.env,
				NODE_V8_COVERAGE: coverageDir,
				NODE_OPTIONS: '',
				NODE_NO_WARNINGS: '1',
			},
			encoding: 'utf8',
		});
		run = JSON.parse(out) as typeof run;
		rmSync(child);
	});

	afterAll(() => rmSync(dir, { recursive: true, force: true }));

	it('credits a function to each spec that runs it, not only to the first', () => {
		expect(probe(run.firstSpec?.result)).toBe(1);
		expect(probe(run.secondSpec?.result)).toBe(2);
	});

	it('marks only the first window as boot and keeps the module bodies that ran at boot', () => {
		expect(run.boot?.boot).toBe(true);
		expect(run.firstSpec?.boot).toBe(false);
		expect(rootCount(run.boot?.result, 'e2e-coverage-windows.ts')).toBe(1);
	});

	it('keeps every window and the exit dump in the folder, so they add up to the whole run', () => {
		const files = readdirSync(join(dir, 'cov'));
		const total = files.reduce((sum, file) => {
			const { result } = JSON.parse(readFileSync(join(dir, 'cov', file), 'utf8')) as {
				result: Profiler.ScriptCoverage[];
			};
			return sum + probe(result);
		}, 0);

		expect(files.filter((f) => f.startsWith('window-'))).toHaveLength(4);
		expect(total).toBe(6);
	});
});
