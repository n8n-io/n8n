import { R as ResolvedCoverageOptions, V as Vitest, C as CoverageMap, a as ReportContext } from './chunks/reporters.d.Rsi0PyxX.js';
import { TransformResult } from 'vite';
import { A as AfterSuiteRunMeta } from './chunks/rpc.d.RH3apGEf.js';
import '@vitest/runner';
import '@vitest/utils';
import 'node:stream';
import './chunks/browser.d.Bz3lxTX-.js';
import './chunks/worker.d.5JNaocaN.js';
import 'vite/module-runner';
import './chunks/config.d.CzIjkicf.js';
import '@vitest/pretty-format';
import '@vitest/snapshot';
import '@vitest/utils/diff';
import './chunks/environment.d.CrsxCzP1.js';
import '@vitest/mocker';
import '@vitest/utils/source-map';
import 'vitest/browser';
import '@vitest/expect';
import 'vitest/optional-types.js';
import './chunks/traces.d.402V_yFI.js';
import './chunks/benchmark.d.DAaHLpsq.js';
import '@vitest/runner/utils';
import 'tinybench';
import './chunks/coverage.d.BZtK59WP.js';
import '@vitest/snapshot/manager';
import 'node:console';
import 'node:fs';

type Threshold = "lines" | "functions" | "statements" | "branches";
interface ResolvedThreshold {
	coverageMap: CoverageMap;
	name: string;
	thresholds: Partial<Record<Threshold, number | undefined>>;
}
/**
* Holds info about raw coverage results that are stored on file system:
*
* ```json
* "project-a": {
*   "web": {
*     "tests/math.test.ts": "coverage-1.json",
*     "tests/utils.test.ts": "coverage-2.json",
* //                          ^^^^^^^^^^^^^^^ Raw coverage on file system
*   },
*   "ssr": { ... },
*   "browser": { ... },
* },
* "project-b": ...
* ```
*/
type CoverageFiles = Map<NonNullable<AfterSuiteRunMeta["projectName"]> | symbol, Record<AfterSuiteRunMeta["environment"], {
	[TestFilenames: string]: string;
}>>;
declare class BaseCoverageProvider<Options extends ResolvedCoverageOptions<"istanbul" | "v8">> {
	ctx: Vitest;
	readonly name: "v8" | "istanbul";
	version: string;
	options: Options;
	globCache: Map<string, boolean>;
	coverageFiles: CoverageFiles;
	pendingPromises: Promise<void>[];
	coverageFilesDirectory: string;
	roots: string[];
	_initialize(ctx: Vitest): void;
	/**
	* Check if file matches `coverage.include` but not `coverage.exclude`
	*/
	isIncluded(_filename: string, root?: string): boolean;
	private getUntestedFilesByRoot;
	getUntestedFiles(testedFiles: string[]): Promise<string[]>;
	createCoverageMap(): CoverageMap;
	generateReports(_: CoverageMap, __: boolean | undefined): Promise<void>;
	parseConfigModule(_: string): Promise<{
		generate: () => {
			code: string;
		};
	}>;
	resolveOptions(): Options;
	clean(clean?: boolean): Promise<void>;
	onAfterSuiteRun({ coverage, environment, projectName, testFiles }: AfterSuiteRunMeta): void;
	readCoverageFiles<CoverageType>({ onFileRead, onFinished, onDebug }: {
		/** Callback invoked with a single coverage result */
		onFileRead: (data: CoverageType) => void;
		/** Callback invoked once all results of a project for specific transform mode are read */
		onFinished: (project: Vitest["projects"][number], environment: string) => Promise<void>;
		onDebug: ((...logs: any[]) => void) & {
			enabled: boolean;
		};
	}): Promise<void>;
	cleanAfterRun(): Promise<void>;
	onTestFailure(): Promise<void>;
	reportCoverage(coverageMap: unknown, { allTestsRun }: ReportContext): Promise<void>;
	reportThresholds(coverageMap: CoverageMap, allTestsRun: boolean | undefined): Promise<void>;
	/**
	* Constructs collected coverage and users' threshold options into separate sets
	* where each threshold set holds their own coverage maps. Threshold set is either
	* for specific files defined by glob pattern or global for all other files.
	*/
	private resolveThresholds;
	/**
	* Check collected coverage against configured thresholds. Sets exit code to 1 when thresholds not reached.
	*/
	private checkThresholds;
	/**
	* Check if current coverage is above configured thresholds and bump the thresholds if needed
	*/
	updateThresholds({ thresholds: allThresholds, onUpdate, configurationFile }: {
		thresholds: ResolvedThreshold[];
		configurationFile: unknown;
		onUpdate: () => void;
	}): Promise<void>;
	mergeReports(coverageMaps: unknown[]): Promise<void>;
	hasTerminalReporter(reporters: ResolvedCoverageOptions["reporter"]): boolean;
	toSlices<T>(array: T[], size: number): T[][];
	createUncoveredFileTransformer(ctx: Vitest): (filename: string) => Promise<TransformResult | null | undefined>;
}

export { BaseCoverageProvider };
