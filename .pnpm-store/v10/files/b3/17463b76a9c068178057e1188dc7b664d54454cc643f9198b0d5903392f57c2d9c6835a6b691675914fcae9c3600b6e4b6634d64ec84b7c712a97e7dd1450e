/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/// <reference types="node" />

import type {Arguments} from 'yargs';
import type {CoverageMapData} from 'istanbul-lib-coverage';
import type {ForegroundColor} from 'chalk';
import type {ReportOptions} from 'istanbul-reports';
import type {SnapshotFormat} from '@jest/schemas';

declare type Argv = Arguments<
  Partial<{
    all: boolean;
    automock: boolean;
    bail: boolean | number;
    cache: boolean;
    cacheDirectory: string;
    changedFilesWithAncestor: boolean;
    changedSince: string;
    ci: boolean;
    clearCache: boolean;
    clearMocks: boolean;
    collectCoverage: boolean;
    collectCoverageFrom: string;
    color: boolean;
    colors: boolean;
    config: string;
    coverage: boolean;
    coverageDirectory: string;
    coveragePathIgnorePatterns: Array<string>;
    coverageReporters: Array<string>;
    coverageThreshold: string;
    debug: boolean;
    env: string;
    expand: boolean;
    findRelatedTests: boolean;
    forceExit: boolean;
    globals: string;
    globalSetup: string | null | undefined;
    globalTeardown: string | null | undefined;
    haste: string;
    ignoreProjects: Array<string>;
    init: boolean;
    injectGlobals: boolean;
    json: boolean;
    lastCommit: boolean;
    logHeapUsage: boolean;
    maxWorkers: number | string;
    moduleDirectories: Array<string>;
    moduleFileExtensions: Array<string>;
    moduleNameMapper: string;
    modulePathIgnorePatterns: Array<string>;
    modulePaths: Array<string>;
    noStackTrace: boolean;
    notify: boolean;
    notifyMode: string;
    onlyChanged: boolean;
    onlyFailures: boolean;
    outputFile: string;
    preset: string | null | undefined;
    prettierPath: string | null | undefined;
    projects: Array<string>;
    randomize: boolean;
    reporters: Array<string>;
    resetMocks: boolean;
    resetModules: boolean;
    resolver: string | null | undefined;
    restoreMocks: boolean;
    rootDir: string;
    roots: Array<string>;
    runInBand: boolean;
    seed: number;
    showSeed: boolean;
    selectProjects: Array<string>;
    setupFiles: Array<string>;
    setupFilesAfterEnv: Array<string>;
    shard: string;
    showConfig: boolean;
    silent: boolean;
    snapshotSerializers: Array<string>;
    testEnvironment: string;
    testEnvironmentOptions: string;
    testFailureExitCode: string | null | undefined;
    testMatch: Array<string>;
    testNamePattern: string;
    testPathIgnorePatterns: Array<string>;
    testPathPattern: Array<string>;
    testRegex: string | Array<string>;
    testResultsProcessor: string;
    testRunner: string;
    testSequencer: string;
    testTimeout: number | null | undefined;
    transform: string;
    transformIgnorePatterns: Array<string>;
    unmockedModulePathPatterns: Array<string> | null | undefined;
    updateSnapshot: boolean;
    useStderr: boolean;
    verbose: boolean;
    version: boolean;
    watch: boolean;
    watchAll: boolean;
    watchman: boolean;
    watchPathIgnorePatterns: Array<string>;
    workerIdleMemoryLimit: number | string;
    workerThreads: boolean;
  }>
>;

declare type ArrayTable = Table | Row;

declare type AssertionResult = {
  ancestorTitles: Array<string>;
  duration?: number | null;
  failureDetails: Array<unknown>;
  failureMessages: Array<string>;
  fullName: string;
  invocations?: number;
  location?: Callsite | null;
  numPassingAsserts: number;
  retryReasons?: Array<string>;
  status: Status;
  title: string;
};

declare type AsyncEvent =
  | {
      name: 'setup';
      testNamePattern?: string;
      runtimeGlobals: JestGlobals;
      parentProcess: Process;
    }
  | {
      name: 'include_test_location_in_result';
    }
  | {
      name: 'hook_start';
      hook: Hook;
    }
  | {
      name: 'hook_success';
      describeBlock?: DescribeBlock;
      test?: TestEntry;
      hook: Hook;
    }
  | {
      name: 'hook_failure';
      error: string | Exception;
      describeBlock?: DescribeBlock;
      test?: TestEntry;
      hook: Hook;
    }
  | {
      name: 'test_fn_start';
      test: TestEntry;
    }
  | {
      name: 'test_fn_success';
      test: TestEntry;
    }
  | {
      name: 'test_fn_failure';
      error: Exception;
      test: TestEntry;
    }
  | {
      name: 'test_retry';
      test: TestEntry;
    }
  | {
      name: 'test_start';
      test: TestEntry;
    }
  | {
      name: 'test_skip';
      test: TestEntry;
    }
  | {
      name: 'test_todo';
      test: TestEntry;
    }
  | {
      name: 'test_started';
      test: TestEntry;
    }
  | {
      name: 'test_done';
      test: TestEntry;
    }
  | {
      name: 'run_describe_start';
      describeBlock: DescribeBlock;
    }
  | {
      name: 'run_describe_finish';
      describeBlock: DescribeBlock;
    }
  | {
      name: 'run_start';
    }
  | {
      name: 'run_finish';
    }
  | {
      name: 'teardown';
    };

declare type AsyncFn = TestFn_2 | HookFn_2;

declare type BlockFn = () => void;

declare type BlockFn_2 = Global.BlockFn;

declare type BlockMode = void | 'skip' | 'only' | 'todo';

declare type BlockName = string;

declare type BlockName_2 = Global.BlockName;

declare type BlockNameLike = BlockName | NameLike;

declare type BlockNameLike_2 = Global.BlockNameLike;

declare type Callsite = {
  column: number;
  line: number;
};

declare namespace Circus {
  export {
    DoneFn,
    BlockFn_2 as BlockFn,
    BlockName_2 as BlockName,
    BlockNameLike_2 as BlockNameLike,
    BlockMode,
    TestMode,
    TestName_2 as TestName,
    TestNameLike_2 as TestNameLike,
    TestFn_2 as TestFn,
    ConcurrentTestFn_2 as ConcurrentTestFn,
    HookFn_2 as HookFn,
    AsyncFn,
    SharedHookType,
    HookType,
    TestContext_2 as TestContext,
    Exception,
    FormattedError,
    Hook,
    EventHandler,
    Event_2 as Event,
    SyncEvent,
    AsyncEvent,
    MatcherResults,
    TestStatus,
    TestNamesPath,
    TestCaseStartInfo,
    TestResult_2 as TestResult,
    RunResult,
    TestResults,
    GlobalErrorHandlers,
    State,
    DescribeBlock,
    TestError,
    TestEntry,
  };
}
export {Circus};

declare type Col = unknown;

declare type ConcurrentTestFn = () => TestReturnValuePromise;

declare type ConcurrentTestFn_2 = Global.ConcurrentTestFn;

declare namespace Config {
  export {
    FakeableAPI,
    GlobalFakeTimersConfig,
    FakeTimersConfig,
    LegacyFakeTimersConfig,
    HasteConfig,
    CoverageReporterName,
    CoverageReporterWithOptions,
    CoverageReporters,
    ReporterConfig,
    TransformerConfig,
    ConfigGlobals,
    DefaultOptions,
    DisplayName,
    InitialOptionsWithRootDir,
    InitialProjectOptions,
    InitialOptions,
    SnapshotUpdateState,
    CoverageThresholdValue,
    GlobalConfig,
    ProjectConfig,
    Argv,
  };
}
export {Config};

declare interface ConfigGlobals {
  [K: string]: unknown;
}

declare type CoverageProvider = 'babel' | 'v8';

declare type CoverageReporterName = keyof ReportOptions;

declare type CoverageReporters = Array<
  CoverageReporterName | CoverageReporterWithOptions
>;

declare type CoverageReporterWithOptions<K = CoverageReporterName> =
  K extends CoverageReporterName
    ? ReportOptions[K] extends never
      ? never
      : [K, Partial<ReportOptions[K]>]
    : never;

declare type CoverageThreshold = {
  [path: string]: CoverageThresholdValue;
  global: CoverageThresholdValue;
};

declare type CoverageThresholdValue = {
  branches?: number;
  functions?: number;
  lines?: number;
  statements?: number;
};

declare type DefaultOptions = {
  automock: boolean;
  bail: number;
  cache: boolean;
  cacheDirectory: string;
  changedFilesWithAncestor: boolean;
  ci: boolean;
  clearMocks: boolean;
  collectCoverage: boolean;
  coveragePathIgnorePatterns: Array<string>;
  coverageReporters: Array<CoverageReporterName>;
  coverageProvider: CoverageProvider;
  detectLeaks: boolean;
  detectOpenHandles: boolean;
  errorOnDeprecated: boolean;
  expand: boolean;
  extensionsToTreatAsEsm: Array<string>;
  fakeTimers: FakeTimers;
  forceCoverageMatch: Array<string>;
  globals: ConfigGlobals;
  haste: HasteConfig;
  injectGlobals: boolean;
  listTests: boolean;
  maxConcurrency: number;
  maxWorkers: number | string;
  moduleDirectories: Array<string>;
  moduleFileExtensions: Array<string>;
  moduleNameMapper: Record<string, string | Array<string>>;
  modulePathIgnorePatterns: Array<string>;
  noStackTrace: boolean;
  notify: boolean;
  notifyMode: NotifyMode;
  openHandlesTimeout: number;
  passWithNoTests: boolean;
  prettierPath: string;
  resetMocks: boolean;
  resetModules: boolean;
  restoreMocks: boolean;
  roots: Array<string>;
  runTestsByPath: boolean;
  runner: string;
  setupFiles: Array<string>;
  setupFilesAfterEnv: Array<string>;
  skipFilter: boolean;
  slowTestThreshold: number;
  snapshotFormat: SnapshotFormat;
  snapshotSerializers: Array<string>;
  testEnvironment: string;
  testEnvironmentOptions: Record<string, unknown>;
  testFailureExitCode: string | number;
  testLocationInResults: boolean;
  testMatch: Array<string>;
  testPathIgnorePatterns: Array<string>;
  testRegex: Array<string>;
  testRunner: string;
  testSequencer: string;
  transformIgnorePatterns: Array<string>;
  useStderr: boolean;
  watch: boolean;
  watchPathIgnorePatterns: Array<string>;
  watchman: boolean;
  workerThreads: boolean;
};

declare interface Describe extends DescribeBase {
  only: DescribeBase;
  skip: DescribeBase;
}

declare interface DescribeBase {
  (blockName: BlockNameLike, blockFn: BlockFn): void;
  each: Each<BlockFn>;
}

declare type DescribeBlock = {
  type: 'describeBlock';
  children: Array<DescribeBlock | TestEntry>;
  hooks: Array<Hook>;
  mode: BlockMode;
  name: BlockName_2;
  parent?: DescribeBlock;
  /** @deprecated Please get from `children` array instead */
  tests: Array<TestEntry>;
};

declare type DisplayName = {
  name: string;
  color: typeof ForegroundColor;
};

declare type DoneFn = Global.DoneFn;

declare type DoneFn_2 = (reason?: string | Error) => void;

declare type DoneTakingTestFn = (
  this: TestContext,
  done: DoneFn_2,
) => ValidTestReturnValues;

declare interface Each<EachFn extends TestFn | BlockFn> {
  <T extends Record<string, unknown>>(table: ReadonlyArray<T>): (
    name: string | NameLike,
    fn: (arg: T, done: DoneFn_2) => ReturnType<EachFn>,
    timeout?: number,
  ) => void;
  <T extends readonly [unknown, ...Array<unknown>]>(table: ReadonlyArray<T>): (
    name: string | NameLike,
    fn: (...args: T) => ReturnType<EachFn>,
    timeout?: number,
  ) => void;
  <T extends ReadonlyArray<unknown>>(table: ReadonlyArray<T>): (
    name: string | NameLike,
    fn: (...args: T) => ReturnType<EachFn>,
    timeout?: number,
  ) => void;
  <T>(table: ReadonlyArray<T>): (
    name: string | NameLike,
    fn: (arg: T, done: DoneFn_2) => ReturnType<EachFn>,
    timeout?: number,
  ) => void;
  <T = unknown>(strings: TemplateStringsArray, ...expressions: Array<T>): (
    name: string | NameLike,
    fn: (arg: Record<string, T>, done: DoneFn_2) => ReturnType<EachFn>,
    timeout?: number,
  ) => void;
  <T extends Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...expressions: Array<unknown>
  ): (
    name: string | NameLike,
    fn: (arg: T, done: DoneFn_2) => ReturnType<EachFn>,
    timeout?: number,
  ) => void;
}

declare type EachTable = ArrayTable | TemplateTable;

declare type EachTestFn<EachCallback extends TestCallback> = (
  ...args: ReadonlyArray<any>
) => ReturnType<EachCallback>;

declare type Event_2 = SyncEvent | AsyncEvent;

declare interface EventHandler {
  (event: AsyncEvent, state: State): void | Promise<void>;
  (event: SyncEvent, state: State): void;
}

declare type Exception = any;

declare interface Failing<T extends TestFn> {
  (testName: TestNameLike, fn: T, timeout?: number): void;
  each: Each<T>;
}

declare type FakeableAPI =
  | 'Date'
  | 'hrtime'
  | 'nextTick'
  | 'performance'
  | 'queueMicrotask'
  | 'requestAnimationFrame'
  | 'cancelAnimationFrame'
  | 'requestIdleCallback'
  | 'cancelIdleCallback'
  | 'setImmediate'
  | 'clearImmediate'
  | 'setInterval'
  | 'clearInterval'
  | 'setTimeout'
  | 'clearTimeout';

declare type FakeTimers = GlobalFakeTimersConfig &
  (
    | (FakeTimersConfig & {
        now?: Exclude<FakeTimersConfig['now'], Date>;
      })
    | LegacyFakeTimersConfig
  );

declare type FakeTimersConfig = {
  /**
   * If set to `true` all timers will be advanced automatically
   * by 20 milliseconds every 20 milliseconds. A custom time delta
   * may be provided by passing a number.
   *
   * @defaultValue
   * The default is `false`.
   */
  advanceTimers?: boolean | number;
  /**
   * List of names of APIs (e.g. `Date`, `nextTick()`, `setImmediate()`,
   * `setTimeout()`) that should not be faked.
   *
   * @defaultValue
   * The default is `[]`, meaning all APIs are faked.
   */
  doNotFake?: Array<FakeableAPI>;
  /**
   * Sets current system time to be used by fake timers.
   *
   * @defaultValue
   * The default is `Date.now()`.
   */
  now?: number | Date;
  /**
   * The maximum number of recursive timers that will be run when calling
   * `jest.runAllTimers()`.
   *
   * @defaultValue
   * The default is `100_000` timers.
   */
  timerLimit?: number;
  /**
   * Use the old fake timers implementation instead of one backed by
   * [`@sinonjs/fake-timers`](https://github.com/sinonjs/fake-timers).
   *
   * @defaultValue
   * The default is `false`.
   */
  legacyFakeTimers?: false;
};

declare type FormattedError = string;

declare type GeneratorReturningTestFn = (
  this: TestContext,
) => TestReturnValueGenerator;

declare namespace Global {
  export {
    ValidTestReturnValues,
    TestReturnValue,
    TestContext,
    DoneFn_2 as DoneFn,
    DoneTakingTestFn,
    PromiseReturningTestFn,
    GeneratorReturningTestFn,
    NameLike,
    TestName,
    TestNameLike,
    TestFn,
    ConcurrentTestFn,
    BlockFn,
    BlockName,
    BlockNameLike,
    HookFn,
    Col,
    Row,
    Table,
    ArrayTable,
    TemplateTable,
    TemplateData,
    EachTable,
    TestCallback,
    EachTestFn,
    HookBase,
    Failing,
    ItBase,
    It,
    ItConcurrentBase,
    ItConcurrentExtended,
    ItConcurrent,
    DescribeBase,
    Describe,
    TestFrameworkGlobals,
    GlobalAdditions,
    Global_2 as Global,
  };
}
export {Global};

declare interface Global_2
  extends GlobalAdditions,
    Omit<typeof globalThis, keyof GlobalAdditions> {
  [extras: PropertyKey]: unknown;
}

declare interface GlobalAdditions extends TestFrameworkGlobals {
  __coverage__: CoverageMapData;
}

declare type GlobalConfig = {
  bail: number;
  changedSince?: string;
  changedFilesWithAncestor: boolean;
  ci: boolean;
  collectCoverage: boolean;
  collectCoverageFrom: Array<string>;
  coverageDirectory: string;
  coveragePathIgnorePatterns?: Array<string>;
  coverageProvider: CoverageProvider;
  coverageReporters: CoverageReporters;
  coverageThreshold?: CoverageThreshold;
  detectLeaks: boolean;
  detectOpenHandles: boolean;
  expand: boolean;
  filter?: string;
  findRelatedTests: boolean;
  forceExit: boolean;
  json: boolean;
  globalSetup?: string;
  globalTeardown?: string;
  lastCommit: boolean;
  logHeapUsage: boolean;
  listTests: boolean;
  maxConcurrency: number;
  maxWorkers: number;
  noStackTrace: boolean;
  nonFlagArgs: Array<string>;
  noSCM?: boolean;
  notify: boolean;
  notifyMode: NotifyMode;
  outputFile?: string;
  onlyChanged: boolean;
  onlyFailures: boolean;
  openHandlesTimeout: number;
  passWithNoTests: boolean;
  projects: Array<string>;
  randomize?: boolean;
  replname?: string;
  reporters?: Array<ReporterConfig>;
  runInBand: boolean;
  runTestsByPath: boolean;
  rootDir: string;
  seed: number;
  showSeed?: boolean;
  shard?: ShardConfig;
  silent?: boolean;
  skipFilter: boolean;
  snapshotFormat: SnapshotFormat;
  errorOnDeprecated: boolean;
  testFailureExitCode: number;
  testNamePattern?: string;
  testPathPattern: string;
  testResultsProcessor?: string;
  testSequencer: string;
  testTimeout?: number;
  updateSnapshot: SnapshotUpdateState;
  useStderr: boolean;
  verbose?: boolean;
  watch: boolean;
  watchAll: boolean;
  watchman: boolean;
  watchPlugins?: Array<{
    path: string;
    config: Record<string, unknown>;
  }> | null;
  workerIdleMemoryLimit?: number;
  workerThreads?: boolean;
};

declare type GlobalErrorHandlers = {
  uncaughtException: Array<(exception: Exception) => void>;
  unhandledRejection: Array<
    (exception: Exception, promise: Promise<unknown>) => void
  >;
};

declare type GlobalFakeTimersConfig = {
  /**
   * Whether fake timers should be enabled globally for all test files.
   *
   * @defaultValue
   * The default is `false`.
   */
  enableGlobally?: boolean;
};

declare type HasteConfig = {
  /** Whether to hash files using SHA-1. */
  computeSha1?: boolean;
  /** The platform to use as the default, e.g. 'ios'. */
  defaultPlatform?: string | null;
  /** Force use of Node's `fs` APIs rather than shelling out to `find` */
  forceNodeFilesystemAPI?: boolean;
  /**
   * Whether to follow symlinks when crawling for files.
   *   This options cannot be used in projects which use watchman.
   *   Projects with `watchman` set to true will error if this option is set to true.
   */
  enableSymlinks?: boolean;
  /** string to a custom implementation of Haste. */
  hasteImplModulePath?: string;
  /** All platforms to target, e.g ['ios', 'android']. */
  platforms?: Array<string>;
  /** Whether to throw on error on module collision. */
  throwOnModuleCollision?: boolean;
  /** Custom HasteMap module */
  hasteMapModulePath?: string;
  /** Whether to retain all files, allowing e.g. search for tests in `node_modules`. */
  retainAllFiles?: boolean;
};

declare type Hook = {
  asyncError: Error;
  fn: HookFn_2;
  type: HookType;
  parent: DescribeBlock;
  seenDone: boolean;
  timeout: number | undefined | null;
};

declare interface HookBase {
  (fn: HookFn, timeout?: number): void;
}

declare type HookFn = TestFn;

declare type HookFn_2 = Global.HookFn;

declare type HookType = SharedHookType | 'afterEach' | 'beforeEach';

declare type InitialOptions = Partial<{
  automock: boolean;
  bail: boolean | number;
  cache: boolean;
  cacheDirectory: string;
  ci: boolean;
  clearMocks: boolean;
  changedFilesWithAncestor: boolean;
  changedSince: string;
  collectCoverage: boolean;
  collectCoverageFrom: Array<string>;
  coverageDirectory: string;
  coveragePathIgnorePatterns: Array<string>;
  coverageProvider: CoverageProvider;
  coverageReporters: CoverageReporters;
  coverageThreshold: CoverageThreshold;
  dependencyExtractor: string;
  detectLeaks: boolean;
  detectOpenHandles: boolean;
  displayName: string | DisplayName;
  expand: boolean;
  extensionsToTreatAsEsm: Array<string>;
  fakeTimers: FakeTimers;
  filter: string;
  findRelatedTests: boolean;
  forceCoverageMatch: Array<string>;
  forceExit: boolean;
  json: boolean;
  globals: ConfigGlobals;
  globalSetup: string | null | undefined;
  globalTeardown: string | null | undefined;
  haste: HasteConfig;
  id: string;
  injectGlobals: boolean;
  reporters: Array<string | ReporterConfig>;
  logHeapUsage: boolean;
  lastCommit: boolean;
  listTests: boolean;
  maxConcurrency: number;
  maxWorkers: number | string;
  moduleDirectories: Array<string>;
  moduleFileExtensions: Array<string>;
  moduleNameMapper: {
    [key: string]: string | Array<string>;
  };
  modulePathIgnorePatterns: Array<string>;
  modulePaths: Array<string>;
  noStackTrace: boolean;
  notify: boolean;
  notifyMode: string;
  onlyChanged: boolean;
  onlyFailures: boolean;
  openHandlesTimeout: number;
  outputFile: string;
  passWithNoTests: boolean;
  preset: string | null | undefined;
  prettierPath: string | null | undefined;
  projects: Array<string | InitialProjectOptions>;
  randomize: boolean;
  replname: string | null | undefined;
  resetMocks: boolean;
  resetModules: boolean;
  resolver: string | null | undefined;
  restoreMocks: boolean;
  rootDir: string;
  roots: Array<string>;
  runner: string;
  runTestsByPath: boolean;
  runtime: string;
  sandboxInjectedGlobals: Array<string>;
  setupFiles: Array<string>;
  setupFilesAfterEnv: Array<string>;
  showSeed: boolean;
  silent: boolean;
  skipFilter: boolean;
  skipNodeResolution: boolean;
  slowTestThreshold: number;
  snapshotResolver: string;
  snapshotSerializers: Array<string>;
  snapshotFormat: SnapshotFormat;
  errorOnDeprecated: boolean;
  testEnvironment: string;
  testEnvironmentOptions: Record<string, unknown>;
  testFailureExitCode: string | number;
  testLocationInResults: boolean;
  testMatch: Array<string>;
  testNamePattern: string;
  testPathIgnorePatterns: Array<string>;
  testRegex: string | Array<string>;
  testResultsProcessor: string;
  testRunner: string;
  testSequencer: string;
  testTimeout: number;
  transform: {
    [regex: string]: string | TransformerConfig;
  };
  transformIgnorePatterns: Array<string>;
  watchPathIgnorePatterns: Array<string>;
  unmockedModulePathPatterns: Array<string>;
  updateSnapshot: boolean;
  useStderr: boolean;
  verbose?: boolean;
  watch: boolean;
  watchAll: boolean;
  watchman: boolean;
  watchPlugins: Array<string | [string, Record<string, unknown>]>;
  workerIdleMemoryLimit: number | string;
  workerThreads: boolean;
}>;

declare type InitialOptionsWithRootDir = InitialOptions &
  Required<Pick<InitialOptions, 'rootDir'>>;

declare type InitialProjectOptions = Pick<
  InitialOptions & {
    cwd?: string;
  },
  keyof ProjectConfig
>;

declare interface It extends ItBase {
  only: ItBase;
  skip: ItBase;
  todo: (testName: TestNameLike) => void;
}

declare interface ItBase {
  (testName: TestNameLike, fn: TestFn, timeout?: number): void;
  each: Each<TestFn>;
  failing: Failing<TestFn>;
}

declare interface ItConcurrent extends It {
  concurrent: ItConcurrentExtended;
}

declare interface ItConcurrentBase {
  (testName: TestNameLike, testFn: ConcurrentTestFn, timeout?: number): void;
  each: Each<ConcurrentTestFn>;
  failing: Failing<ConcurrentTestFn>;
}

declare interface ItConcurrentExtended extends ItConcurrentBase {
  only: ItConcurrentBase;
  skip: ItConcurrentBase;
}

declare interface JestGlobals extends Global.TestFrameworkGlobals {
  expect: unknown;
}

declare type LegacyFakeTimersConfig = {
  /**
   * Use the old fake timers implementation instead of one backed by
   * [`@sinonjs/fake-timers`](https://github.com/sinonjs/fake-timers).
   *
   * @defaultValue
   * The default is `false`.
   */
  legacyFakeTimers?: true;
};

declare type MatcherResults = {
  actual: unknown;
  expected: unknown;
  name: string;
  pass: boolean;
};

declare type NameLike = number | Function;

declare type NotifyMode =
  | 'always'
  | 'failure'
  | 'success'
  | 'change'
  | 'success-change'
  | 'failure-change';

declare type Process = NodeJS.Process;

declare type ProjectConfig = {
  automock: boolean;
  cache: boolean;
  cacheDirectory: string;
  clearMocks: boolean;
  collectCoverageFrom: Array<string>;
  coverageDirectory: string;
  coveragePathIgnorePatterns: Array<string>;
  cwd: string;
  dependencyExtractor?: string;
  detectLeaks: boolean;
  detectOpenHandles: boolean;
  displayName?: DisplayName;
  errorOnDeprecated: boolean;
  extensionsToTreatAsEsm: Array<string>;
  fakeTimers: FakeTimers;
  filter?: string;
  forceCoverageMatch: Array<string>;
  globalSetup?: string;
  globalTeardown?: string;
  globals: ConfigGlobals;
  haste: HasteConfig;
  id: string;
  injectGlobals: boolean;
  moduleDirectories: Array<string>;
  moduleFileExtensions: Array<string>;
  moduleNameMapper: Array<[string, string]>;
  modulePathIgnorePatterns: Array<string>;
  modulePaths?: Array<string>;
  openHandlesTimeout: number;
  preset?: string;
  prettierPath: string;
  resetMocks: boolean;
  resetModules: boolean;
  resolver?: string;
  restoreMocks: boolean;
  rootDir: string;
  roots: Array<string>;
  runner: string;
  runtime?: string;
  sandboxInjectedGlobals: Array<keyof typeof globalThis>;
  setupFiles: Array<string>;
  setupFilesAfterEnv: Array<string>;
  skipFilter: boolean;
  skipNodeResolution?: boolean;
  slowTestThreshold: number;
  snapshotResolver?: string;
  snapshotSerializers: Array<string>;
  snapshotFormat: SnapshotFormat;
  testEnvironment: string;
  testEnvironmentOptions: Record<string, unknown>;
  testMatch: Array<string>;
  testLocationInResults: boolean;
  testPathIgnorePatterns: Array<string>;
  testRegex: Array<string | RegExp>;
  testRunner: string;
  transform: Array<[string, string, Record<string, unknown>]>;
  transformIgnorePatterns: Array<string>;
  watchPathIgnorePatterns: Array<string>;
  unmockedModulePathPatterns?: Array<string>;
  workerIdleMemoryLimit?: number;
};

declare type PromiseReturningTestFn = (this: TestContext) => TestReturnValue;

declare type ReporterConfig = [string, Record<string, unknown>];

declare type Row = ReadonlyArray<Col>;

declare type RunResult = {
  unhandledErrors: Array<FormattedError>;
  testResults: TestResults;
};

declare type SerializableError = {
  code?: unknown;
  message: string;
  stack: string | null | undefined;
  type?: string;
};

declare type ShardConfig = {
  shardIndex: number;
  shardCount: number;
};

declare type SharedHookType = 'afterAll' | 'beforeAll';

declare type SnapshotUpdateState = 'all' | 'new' | 'none';

declare type State = {
  currentDescribeBlock: DescribeBlock;
  currentlyRunningTest?: TestEntry | null;
  expand?: boolean;
  hasFocusedTests: boolean;
  hasStarted: boolean;
  originalGlobalErrorHandlers?: GlobalErrorHandlers;
  parentProcess: Process | null;
  randomize?: boolean;
  rootDescribeBlock: DescribeBlock;
  seed: number;
  testNamePattern?: RegExp | null;
  testTimeout: number;
  unhandledErrors: Array<Exception>;
  includeTestLocationInResult: boolean;
  maxConcurrency: number;
};

declare type Status =
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'pending'
  | 'todo'
  | 'disabled'
  | 'focused';

declare type SyncEvent =
  | {
      asyncError: Error;
      mode: BlockMode;
      name: 'start_describe_definition';
      blockName: BlockName_2;
    }
  | {
      mode: BlockMode;
      name: 'finish_describe_definition';
      blockName: BlockName_2;
    }
  | {
      asyncError: Error;
      name: 'add_hook';
      hookType: HookType;
      fn: HookFn_2;
      timeout: number | undefined;
    }
  | {
      asyncError: Error;
      name: 'add_test';
      testName: TestName_2;
      fn: TestFn_2;
      mode?: TestMode;
      concurrent: boolean;
      timeout: number | undefined;
      failing: boolean;
    }
  | {
      name: 'error';
      error: Exception;
    };

declare type Table = ReadonlyArray<Row>;

declare type TemplateData = ReadonlyArray<unknown>;

declare type TemplateTable = TemplateStringsArray;

declare type TestCallback = BlockFn | TestFn | ConcurrentTestFn;

declare type TestCaseStartInfo = {
  ancestorTitles: Array<string>;
  fullName: string;
  mode: TestMode;
  title: string;
  startedAt?: number | null;
};

declare type TestContext = Record<string, unknown>;

declare type TestContext_2 = Global.TestContext;

declare type TestEntry = {
  type: 'test';
  asyncError: Exception;
  errors: Array<TestError>;
  retryReasons: Array<TestError>;
  fn: TestFn_2;
  invocations: number;
  mode: TestMode;
  concurrent: boolean;
  name: TestName_2;
  numPassingAsserts: number;
  parent: DescribeBlock;
  startedAt?: number | null;
  duration?: number | null;
  seenDone: boolean;
  status?: TestStatus | null;
  timeout?: number;
  failing: boolean;
};

declare type TestError = Exception | [Exception | undefined, Exception];

declare type TestFn =
  | PromiseReturningTestFn
  | GeneratorReturningTestFn
  | DoneTakingTestFn;

declare type TestFn_2 = Global.TestFn;

declare interface TestFrameworkGlobals {
  it: ItConcurrent;
  test: ItConcurrent;
  fit: ItBase & {
    concurrent?: ItConcurrentBase;
  };
  xit: ItBase;
  xtest: ItBase;
  describe: Describe;
  xdescribe: DescribeBase;
  fdescribe: DescribeBase;
  beforeAll: HookBase;
  beforeEach: HookBase;
  afterEach: HookBase;
  afterAll: HookBase;
}

declare type TestMode = BlockMode;

declare type TestName = string;

declare type TestName_2 = Global.TestName;

declare type TestNameLike = TestName | NameLike;

declare type TestNameLike_2 = Global.TestNameLike;

declare type TestNamesPath = Array<TestName_2 | BlockName_2>;

declare namespace TestResult {
  export {AssertionResult, SerializableError};
}
export {TestResult};

declare type TestResult_2 = {
  duration?: number | null;
  errors: Array<FormattedError>;
  errorsDetailed: Array<MatcherResults | unknown>;
  invocations: number;
  status: TestStatus;
  location?: {
    column: number;
    line: number;
  } | null;
  numPassingAsserts: number;
  retryReasons: Array<FormattedError>;
  testPath: TestNamesPath;
};

declare type TestResults = Array<TestResult_2>;

declare type TestReturnValue = ValidTestReturnValues | TestReturnValuePromise;

declare type TestReturnValueGenerator = Generator<void, unknown, void>;

declare type TestReturnValuePromise = Promise<unknown>;

declare type TestStatus = 'skip' | 'done' | 'todo';

declare type TransformerConfig = [string, Record<string, unknown>];

declare type TransformResult = {
  code: string;
  originalCode: string;
  sourceMapPath: string | null;
};

declare namespace TransformTypes {
  export {TransformResult};
}
export {TransformTypes};

declare type ValidTestReturnValues = void | undefined;

export {};
