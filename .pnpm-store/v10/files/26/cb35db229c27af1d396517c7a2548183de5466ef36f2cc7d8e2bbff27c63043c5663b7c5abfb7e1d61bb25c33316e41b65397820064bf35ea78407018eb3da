import * as vite from 'vite';
import { InlineConfig, UserConfig as UserConfig$1, Plugin, ResolvedConfig as ResolvedConfig$1, ViteDevServer, LogLevel, LoggerOptions, Logger as Logger$1 } from 'vite';
export { vite as Vite };
export { esbuildVersion, isCSSRequest, isFileLoadingAllowed, parseAst, parseAstAsync, rollupVersion, version as viteVersion } from 'vite';
import { IncomingMessage } from 'node:http';
import { h as ResolvedConfig, f as UserConfig, i as VitestRunMode, j as VitestOptions, V as Vitest, A as ApiConfig, k as TestSpecification, T as TestProject, P as PoolWorker, l as PoolOptions, m as WorkerRequest, n as TestSequencer, L as Logger } from './chunks/reporters.d.Rsi0PyxX.js';
export { at as BaseCoverageOptions, Y as BenchmarkUserOptions, Z as BrowserBuiltinProvider, $ as BrowserCommand, a0 as BrowserCommandContext, a1 as BrowserConfigOptions, a2 as BrowserInstanceOption, a3 as BrowserModuleMocker, a4 as BrowserOrchestrator, a5 as BrowserProvider, a6 as BrowserProviderOption, a7 as BrowserScript, a8 as BrowserServerFactory, a9 as BrowserServerOptions, aa as BrowserServerState, ab as BrowserServerStateSession, ai as BuiltinEnvironment, ac as CDPSession, aj as CSSModuleScopeStrategy, au as CoverageIstanbulOptions, av as CoverageOptions, aw as CoverageProvider, ax as CoverageProviderModule, ay as CoverageReporter, c as CoverageV8Options, az as CustomProviderOptions, ak as DepsOptimizationOptions, al as EnvironmentOptions, H as HTMLOptions, I as InlineConfig, t as JUnitOptions, J as JsonOptions, M as ModuleDiagnostic, O as OnServerRestartHandler, o as OnTestsRerunHandler, ad as ParentProjectBrowser, am as Pool, q as PoolRunnerInitializer, r as PoolTask, ae as ProjectBrowser, an as ProjectConfig, a as ReportContext, aB as ReportedHookContext, aC as Reporter, ap as ResolveSnapshotPathHandler, aq as ResolveSnapshotPathHandlerContext, af as ResolvedBrowserOptions, R as ResolvedCoverageOptions, ao as ResolvedProjectConfig, S as SerializedTestProject, u as TaskOptions, v as TestCase, w as TestCollection, x as TestDiagnostic, y as TestModule, z as TestModuleState, B as TestResult, D as TestResultFailed, E as TestResultPassed, F as TestResultSkipped, aD as TestRunEndReason, aA as TestRunResult, X as TestSequencerConstructor, G as TestState, K as TestSuite, N as TestSuiteState, ag as ToMatchScreenshotComparators, ah as ToMatchScreenshotOptions, ar as TypecheckConfig, U as UserWorkspaceConfig, as as VitestEnvironment, p as VitestPackageInstaller, W as WatcherTriggerPattern, s as WorkerResponse, _ as _BrowserNames, Q as experimental_getRunnerTask } from './chunks/reporters.d.Rsi0PyxX.js';
export { C as CacheKeyIdGenerator, a as CacheKeyIdGeneratorContext, V as VitestPluginContext } from './chunks/plugin.d.v1sC_bv1.js';
import { Awaitable } from '@vitest/utils';
export { SerializedError } from '@vitest/utils';
import { R as RuntimeRPC } from './chunks/rpc.d.RH3apGEf.js';
import { Writable } from 'node:stream';
import { C as ContextRPC } from './chunks/worker.d.5JNaocaN.js';
export { T as TestExecutionType } from './chunks/worker.d.5JNaocaN.js';
import { Debugger } from 'obug';
import './chunks/global.d.B15mdLcR.js';
export { Task as RunnerTask, TaskResult as RunnerTaskResult, TaskResultPack as RunnerTaskResultPack, Test as RunnerTestCase, File as RunnerTestFile, Suite as RunnerTestSuite, SequenceHooks, SequenceSetupFiles } from '@vitest/runner';
export { b as RuntimeConfig } from './chunks/config.d.CzIjkicf.js';
export { generateFileHash } from '@vitest/runner/utils';
import './chunks/browser.d.Bz3lxTX-.js';
import '@vitest/mocker';
import '@vitest/utils/source-map';
import 'vitest/browser';
import '@vitest/pretty-format';
import '@vitest/snapshot';
import '@vitest/utils/diff';
import '@vitest/expect';
import 'vitest/optional-types.js';
import './chunks/traces.d.402V_yFI.js';
import './chunks/benchmark.d.DAaHLpsq.js';
import 'tinybench';
import './chunks/coverage.d.BZtK59WP.js';
import '@vitest/snapshot/manager';
import 'node:console';
import 'node:fs';
import 'vite/module-runner';
import './chunks/environment.d.CrsxCzP1.js';

type RawErrsMap = Map<string, TscErrorInfo[]>;
interface TscErrorInfo {
	filePath: string;
	errCode: number;
	errMsg: string;
	line: number;
	column: number;
}
interface CollectLineNumbers {
	target: number;
	next: number;
	prev?: number;
}
type CollectLines = { [key in keyof CollectLineNumbers] : string };
interface RootAndTarget {
	root: string;
	targetAbsPath: string;
}
type Context = RootAndTarget & {
	rawErrsMap: RawErrsMap;
	openedDirs: Set<string>;
	lastActivePath?: string;
};

declare function isValidApiRequest(config: ResolvedConfig, req: IncomingMessage): boolean;

declare function escapeTestName(label: string, dynamic: boolean): string;

interface CliOptions extends UserConfig {
	/**
	* Override the watch mode
	*/
	run?: boolean;
	/**
	* Removes colors from the console output
	*/
	color?: boolean;
	/**
	* Output collected tests as JSON or to a file
	*/
	json?: string | boolean;
	/**
	* Output collected test files only
	*/
	filesOnly?: boolean;
	/**
	* Override vite config's configLoader from cli.
	* Use `bundle` to bundle the config with esbuild or `runner` (experimental) to process it on the fly (default: `bundle`).
	* This is only available with **vite version 6.1.0** and above.
	* @experimental
	*/
	configLoader?: InlineConfig extends {
		configLoader?: infer T;
	} ? T : never;
}
/**
* Start Vitest programmatically
*
* Returns a Vitest instance if initialized successfully.
*/
declare function startVitest(mode: VitestRunMode, cliFilters?: string[], options?: CliOptions, viteOverrides?: UserConfig$1, vitestOptions?: VitestOptions): Promise<Vitest>;

interface CliParseOptions {
	allowUnknownOptions?: boolean;
}
declare function parseCLI(argv: string | string[], config?: CliParseOptions): {
	filter: string[];
	options: CliOptions;
};

declare function resolveApiServerConfig<Options extends ApiConfig & Omit<UserConfig, "expect">>(options: Options, defaultPort: number): ApiConfig | undefined;

declare function createVitest(mode: VitestRunMode, options: CliOptions, viteOverrides?: UserConfig$1, vitestOptions?: VitestOptions): Promise<Vitest>;

declare class FilesNotFoundError extends Error {
	code: string;
	constructor(mode: "test" | "benchmark");
}
declare class GitNotFoundError extends Error {
	code: string;
	constructor();
}

declare function VitestPlugin(options?: UserConfig, vitest?: Vitest): Promise<Plugin[]>;

declare function resolveConfig(options?: UserConfig, viteOverrides?: UserConfig$1): Promise<{
	vitestConfig: ResolvedConfig;
	viteConfig: ResolvedConfig$1;
}>;

declare function resolveFsAllow(projectRoot: string, rootConfigFile: string | false | undefined): string[];

type RunWithFiles = (files: TestSpecification[], invalidates?: string[]) => Promise<void>;
interface ProcessPool {
	name: string;
	runTests: RunWithFiles;
	collectTests: RunWithFiles;
	close?: () => Awaitable<void>;
}
declare function getFilePoolName(project: TestProject): ResolvedConfig["pool"];

interface MethodsOptions {
	cacheFs?: boolean;
	collect?: boolean;
}
declare function createMethodsRPC(project: TestProject, methodsOptions?: MethodsOptions): RuntimeRPC;

/** @experimental */
declare class ForksPoolWorker implements PoolWorker {
	readonly name: string;
	readonly cacheFs: boolean;
	protected readonly entrypoint: string;
	protected execArgv: string[];
	protected env: Partial<NodeJS.ProcessEnv>;
	private _fork?;
	private stdout;
	private stderr;
	constructor(options: PoolOptions);
	on(event: string, callback: (arg: any) => void): void;
	off(event: string, callback: (arg: any) => void): void;
	send(message: WorkerRequest): void;
	start(): Promise<void>;
	stop(): Promise<void>;
	deserialize(data: unknown): unknown;
	private get fork();
}

/** @experimental */
declare class ThreadsPoolWorker implements PoolWorker {
	readonly name: string;
	protected readonly entrypoint: string;
	protected execArgv: string[];
	protected env: Partial<NodeJS.ProcessEnv>;
	private _thread?;
	private stdout;
	private stderr;
	constructor(options: PoolOptions);
	on(event: string, callback: (arg: any) => void): void;
	off(event: string, callback: (arg: any) => void): void;
	send(message: WorkerRequest): void;
	start(): Promise<void>;
	stop(): Promise<void>;
	deserialize(data: unknown): unknown;
	private get thread();
}

/** @experimental */
declare class TypecheckPoolWorker implements PoolWorker {
	readonly name: string;
	private readonly project;
	private _eventEmitter;
	constructor(options: PoolOptions);
	start(): Promise<void>;
	stop(): Promise<void>;
	canReuse(): boolean;
	send(message: WorkerRequest): void;
	on(event: string, callback: (arg: any) => any): void;
	off(event: string, callback: (arg: any) => any): void;
	deserialize(data: unknown): unknown;
}

/** @experimental */
declare class VmForksPoolWorker extends ForksPoolWorker {
	readonly name = "vmForks";
	readonly reportMemory: true;
	protected readonly entrypoint: string;
	constructor(options: PoolOptions);
}

/** @experimental */
declare class VmThreadsPoolWorker extends ThreadsPoolWorker {
	readonly name = "vmThreads";
	readonly reportMemory: true;
	protected readonly entrypoint: string;
	constructor(options: PoolOptions);
}

declare class BaseSequencer implements TestSequencer {
	protected ctx: Vitest;
	constructor(ctx: Vitest);
	shard(files: TestSpecification[]): Promise<TestSpecification[]>;
	sort(files: TestSpecification[]): Promise<TestSpecification[]>;
	private calculateShardRange;
}

declare function registerConsoleShortcuts(ctx: Vitest, stdin: NodeJS.ReadStream | undefined, stdout: NodeJS.WriteStream | Writable): () => void;

interface WorkerContext extends ContextRPC {}

/**
* Check if the url is allowed to be served, via the `server.fs` config.
* @deprecated Use the `isFileLoadingAllowed` function instead.
*/
declare function isFileServingAllowed(config: ResolvedConfig$1, url: string): boolean;
declare function isFileServingAllowed(url: string, server: ViteDevServer): boolean;

declare function createViteLogger(console: Logger, level?: LogLevel, options?: LoggerOptions): Logger$1;

declare const rootDir: string;
declare const distDir: string;

declare function createDebugger(namespace: `vitest:${string}`): Debugger | undefined;

declare const version: string;

declare const createViteServer: typeof vite.createServer;

declare const rolldownVersion: string | undefined;

export { ApiConfig, BaseSequencer, ForksPoolWorker, GitNotFoundError, PoolOptions, PoolWorker, ResolvedConfig, TestProject, TestSequencer, TestSpecification, UserConfig as TestUserConfig, FilesNotFoundError as TestsNotFoundError, ThreadsPoolWorker, TypecheckPoolWorker, Vitest, VitestOptions, VitestPlugin, VitestRunMode, VmForksPoolWorker, VmThreadsPoolWorker, WorkerRequest, createDebugger, createMethodsRPC, createViteLogger, createViteServer, createVitest, distDir, escapeTestName, getFilePoolName, isFileServingAllowed, isValidApiRequest, parseCLI, registerConsoleShortcuts, resolveApiServerConfig, resolveConfig, resolveFsAllow, rolldownVersion, rootDir, startVitest, version };
export type { CliOptions, CliParseOptions, ProcessPool, CollectLineNumbers as TypeCheckCollectLineNumbers, CollectLines as TypeCheckCollectLines, Context as TypeCheckContext, TscErrorInfo as TypeCheckErrorInfo, RawErrsMap as TypeCheckRawErrorsMap, RootAndTarget as TypeCheckRootAndTarget, WorkerContext };
