import { y as ResolvedConfig, x as UserConfig, u as VitestRunMode, G as VitestOptions, V as Vitest, A as ApiConfig, T as TestProject, H as TestSequencer, J as TestSpecification, L as Logger, K as TestModule, M as ModuleDiagnostic } from './chunks/reporters.d.DG9VKi4m.js';
export { B as BaseCoverageOptions, E as BenchmarkUserOptions, af as BrowserBuiltinProvider, ag as BrowserCommand, ah as BrowserCommandContext, p as BrowserConfigOptions, ai as BrowserInstanceOption, aj as BrowserModuleMocker, ak as BrowserOrchestrator, al as BrowserProvider, am as BrowserProviderInitializationOptions, an as BrowserProviderModule, ao as BrowserProviderOptions, o as BrowserScript, ap as BrowserServerState, aq as BrowserServerStateSession, q as BuiltinEnvironment, ar as CDPSession, t as CSSModuleScopeStrategy, l as CoverageIstanbulOptions, k as CoverageOptions, g as CoverageProvider, h as CoverageProviderModule, i as CoverageReporter, c as CoverageV8Options, m as CustomProviderOptions, D as DepsOptimizationOptions, $ as HTMLOptions, I as InlineConfig, a1 as JUnitOptions, a0 as JsonOptions, O as OnServerRestartHandler, N as OnTestsRerunHandler, as as ParentProjectBrowser, P as Pool, s as PoolOptions, X as ProcessPool, at as ProjectBrowser, z as ProjectConfig, a as ReportContext, az as ReportedHookContext, n as Reporter, aw as ResolveSnapshotPathHandler, ax as ResolveSnapshotPathHandlerContext, au as ResolvedBrowserOptions, R as ResolvedCoverageOptions, av as ResolvedProjectConfig, _ as SerializedTestProject, a2 as TaskOptions, a3 as TestCase, a4 as TestCollection, a5 as TestDiagnostic, a6 as TestModuleState, a7 as TestResult, a8 as TestResultFailed, a9 as TestResultPassed, aa as TestResultSkipped, aA as TestRunEndReason, ay as TestRunResult, ae as TestSequencerConstructor, ab as TestState, ac as TestSuite, ad as TestSuiteState, v as TransformModePatterns, w as TypecheckConfig, U as UserWorkspaceConfig, r as VitestEnvironment, Q as VitestPackageInstaller, Y as WorkspaceSpec, Z as getFilePoolName } from './chunks/reporters.d.DG9VKi4m.js';
import { InlineConfig, UserConfig as UserConfig$1, Plugin, ResolvedConfig as ResolvedConfig$1, LogLevel, LoggerOptions, Logger as Logger$1, createServer as createServer$1 } from 'vite';
import * as vite from 'vite';
export { vite as Vite };
export { esbuildVersion, isFileServingAllowed, parseAst, parseAstAsync, rollupVersion, version as viteVersion } from 'vite';
import { IncomingMessage } from 'node:http';
import { R as RuntimeRPC } from './chunks/worker.d.CHGSOG0s.js';
export { T as TestExecutionType } from './chunks/worker.d.CHGSOG0s.js';
import { Writable } from 'node:stream';
export { V as VitestPluginContext } from './chunks/vite.d.D3ndlJcw.js';
export { W as WorkerContext } from './chunks/worker.d.C-KN07Ls.js';
export { C as TypeCheckCollectLineNumbers, a as TypeCheckCollectLines, c as TypeCheckContext, T as TypeCheckErrorInfo, R as TypeCheckRawErrorsMap, b as TypeCheckRootAndTarget } from './chunks/global.d.CXRAxnWc.js';
import { Debugger } from 'debug';
export { Task as RunnerTask, TaskResult as RunnerTaskResult, TaskResultPack as RunnerTaskResultPack, Test as RunnerTestCase, File as RunnerTestFile, Suite as RunnerTestSuite, SequenceHooks, SequenceSetupFiles } from '@vitest/runner';
export { f as EnvironmentOptions, H as HappyDOMOptions, J as JSDOMOptions } from './chunks/environment.d.Dmw5ulng.js';
export { SerializedError } from '@vitest/utils';
export { b as RuntimeConfig } from './chunks/config.d.UqE-KR0o.js';
export { generateFileHash } from '@vitest/runner/utils';
import 'node:console';
import '@vitest/mocker';
import '@vitest/utils/source-map';
import '@vitest/pretty-format';
import '@vitest/snapshot';
import '@vitest/utils/diff';
import 'vite-node';
import 'chai';
import './chunks/benchmark.d.BwvBVTda.js';
import 'tinybench';
import './chunks/coverage.d.S9RMNXIe.js';
import 'vite-node/client';
import '@vitest/snapshot/manager';
import 'node:fs';
import 'node:worker_threads';
import '@vitest/expect';
import 'vitest/optional-types.js';
import '@vitest/snapshot/environment';

declare function isValidApiRequest(config: ResolvedConfig, req: IncomingMessage): boolean;

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
		configLoader?: infer T
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
	filter: string[]
	options: CliOptions
};

declare function resolveApiServerConfig<Options extends ApiConfig & UserConfig>(options: Options, defaultPort: number): ApiConfig | undefined;

declare function createVitest(mode: VitestRunMode, options: CliOptions, viteOverrides?: UserConfig$1, vitestOptions?: VitestOptions): Promise<Vitest>;

declare class FilesNotFoundError extends Error {
	code: string;
	constructor(mode: "test" | "benchmark");
}
declare class GitNotFoundError extends Error {
	code: string;
	constructor();
}

/** @deprecated use `TestProject` instead */
type GlobalSetupContext = TestProject;

declare function VitestPlugin(options?: UserConfig, ctx?: Vitest): Promise<Plugin[]>;

declare function resolveConfig(options?: UserConfig, viteOverrides?: UserConfig$1): Promise<{
	vitestConfig: ResolvedConfig
	viteConfig: ResolvedConfig$1
}>;

declare function resolveFsAllow(projectRoot: string, rootConfigFile: string | false | undefined): string[];

interface MethodsOptions {
	cacheFs?: boolean;
	collect?: boolean;
}
declare function createMethodsRPC(project: TestProject, options?: MethodsOptions): RuntimeRPC;

declare class BaseSequencer implements TestSequencer {
	protected ctx: Vitest;
	constructor(ctx: Vitest);
	shard(files: TestSpecification[]): Promise<TestSpecification[]>;
	sort(files: TestSpecification[]): Promise<TestSpecification[]>;
}

declare function registerConsoleShortcuts(ctx: Vitest, stdin: NodeJS.ReadStream | undefined, stdout: NodeJS.WriteStream | Writable): () => void;

declare function createViteLogger(console: Logger, level?: LogLevel, options?: LoggerOptions): Logger$1;

declare const rootDir: string;
declare const distDir: string;

declare function createDebugger(namespace: `vitest:${string}`): Debugger | undefined;

declare const version: string;

/** @deprecated use `createViteServer` instead */
declare const createServer: typeof createServer$1;
declare const createViteServer: typeof createServer$1;

/**
* @deprecated Use `TestModule` instead
*/
declare const TestFile: typeof TestModule;

/**
* @deprecated Use `ModuleDiagnostic` instead
*/
type FileDiagnostic = ModuleDiagnostic;

export { ApiConfig, BaseSequencer, GitNotFoundError, ModuleDiagnostic, ResolvedConfig, TestFile, TestModule, TestProject, TestSequencer, TestSpecification, FilesNotFoundError as TestsNotFoundError, UserConfig, Vitest, VitestOptions, VitestPlugin, VitestRunMode, TestProject as WorkspaceProject, createDebugger, createMethodsRPC, createServer, createViteLogger, createViteServer, createVitest, distDir, isValidApiRequest, parseCLI, registerConsoleShortcuts, resolveApiServerConfig, resolveConfig, resolveFsAllow, rootDir, startVitest, version };
export type { CliParseOptions, FileDiagnostic, GlobalSetupContext };
