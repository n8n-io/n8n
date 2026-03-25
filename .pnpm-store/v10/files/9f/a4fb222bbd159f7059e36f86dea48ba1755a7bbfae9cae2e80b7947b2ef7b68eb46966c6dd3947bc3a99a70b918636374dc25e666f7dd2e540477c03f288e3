/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/// <reference types="node" />

import {AggregatedResult} from '@jest/test-result';
import type {AssertionResult} from '@jest/test-result';
import type {Circus} from '@jest/types';
import {Config} from '@jest/types';
import {SnapshotSummary} from '@jest/test-result';
import type {Suite} from '@jest/test-result';
import {Test} from '@jest/test-result';
import {TestCaseResult} from '@jest/test-result';
import {TestContext} from '@jest/test-result';
import {TestResult} from '@jest/test-result';

export {AggregatedResult};

export declare class BaseReporter implements Reporter {
  private _error?;
  log(message: string): void;
  onRunStart(
    _results?: AggregatedResult,
    _options?: ReporterOnStartOptions,
  ): void;
  onTestCaseResult(_test: Test, _testCaseResult: TestCaseResult): void;
  onTestResult(
    _test?: Test,
    _testResult?: TestResult,
    _results?: AggregatedResult,
  ): void;
  onTestStart(_test?: Test): void;
  onRunComplete(
    _testContexts?: Set<TestContext>,
    _aggregatedResults?: AggregatedResult,
  ): Promise<void> | void;
  protected _setError(error: Error): void;
  getLastError(): Error | undefined;
}

export {Config};

export declare class CoverageReporter extends BaseReporter {
  private readonly _context;
  private readonly _coverageMap;
  private readonly _globalConfig;
  private readonly _sourceMapStore;
  private readonly _v8CoverageResults;
  static readonly filename: string;
  constructor(globalConfig: Config.GlobalConfig, context: ReporterContext);
  onTestResult(_test: Test, testResult: TestResult): void;
  onRunComplete(
    testContexts: Set<TestContext>,
    aggregatedResults: AggregatedResult,
  ): Promise<void>;
  private _addUntestedFiles;
  private _checkThreshold;
  private _getCoverageResult;
}

export declare class DefaultReporter extends BaseReporter {
  private _clear;
  private readonly _err;
  protected _globalConfig: Config.GlobalConfig;
  private readonly _out;
  private readonly _status;
  private readonly _bufferedOutput;
  static readonly filename: string;
  constructor(globalConfig: Config.GlobalConfig);
  protected __wrapStdio(
    stream: NodeJS.WritableStream | NodeJS.WriteStream,
  ): void;
  forceFlushBufferedOutput(): void;
  protected __clearStatus(): void;
  protected __printStatus(): void;
  onRunStart(
    aggregatedResults: AggregatedResult,
    options: ReporterOnStartOptions,
  ): void;
  onTestStart(test: Test): void;
  onTestCaseResult(test: Test, testCaseResult: TestCaseResult): void;
  onRunComplete(): void;
  onTestResult(
    test: Test,
    testResult: TestResult,
    aggregatedResults: AggregatedResult,
  ): void;
  testFinished(
    config: Config.ProjectConfig,
    testResult: TestResult,
    aggregatedResults: AggregatedResult,
  ): void;
  printTestFileHeader(
    testPath: string,
    config: Config.ProjectConfig,
    result: TestResult,
  ): void;
  printTestFileFailureMessage(
    _testPath: string,
    _config: Config.ProjectConfig,
    result: TestResult,
  ): void;
}

declare function formatTestPath(
  config: Config.GlobalConfig | Config.ProjectConfig,
  testPath: string,
): string;

declare function getResultHeader(
  result: TestResult,
  globalConfig: Config.GlobalConfig,
  projectConfig?: Config.ProjectConfig,
): string;

declare function getSnapshotStatus(
  snapshot: TestResult['snapshot'],
  afterUpdate: boolean,
): Array<string>;

declare function getSnapshotSummary(
  snapshots: SnapshotSummary,
  globalConfig: Config.GlobalConfig,
  updateCommand: string,
): Array<string>;

declare function getSummary(
  aggregatedResults: AggregatedResult,
  options?: SummaryOptions,
): string;

export declare class GitHubActionsReporter extends BaseReporter {
  #private;
  static readonly filename: string;
  private readonly options;
  constructor(
    _globalConfig: Config.GlobalConfig,
    reporterOptions?: {
      silent?: boolean;
    },
  );
  onTestResult(
    test: Test,
    testResult: TestResult,
    aggregatedResults: AggregatedResult,
  ): void;
  private generateAnnotations;
  private isLastTestSuite;
  private printFullResult;
  private arrayEqual;
  private arrayChild;
  private getResultTree;
  private getResultChildren;
  private printResultTree;
  private recursivePrintResultTree;
  private printFailedTestLogs;
  private startGroup;
  private endGroup;
}

export declare class NotifyReporter extends BaseReporter {
  private readonly _notifier;
  private readonly _globalConfig;
  private _context;
  static readonly filename: string;
  constructor(globalConfig: Config.GlobalConfig, context: ReporterContext);
  onRunComplete(testContexts: Set<TestContext>, result: AggregatedResult): void;
}

declare function printDisplayName(config: Config.ProjectConfig): string;

declare function relativePath(
  config: Config.GlobalConfig | Config.ProjectConfig,
  testPath: string,
): {
  basename: string;
  dirname: string;
};

export declare interface Reporter {
  readonly onTestResult?: (
    test: Test,
    testResult: TestResult,
    aggregatedResult: AggregatedResult,
  ) => Promise<void> | void;
  readonly onTestFileResult?: (
    test: Test,
    testResult: TestResult,
    aggregatedResult: AggregatedResult,
  ) => Promise<void> | void;
  /**
   * Called before running a spec (prior to `before` hooks)
   * Not called for `skipped` and `todo` specs
   */
  readonly onTestCaseStart?: (
    test: Test,
    testCaseStartInfo: Circus.TestCaseStartInfo,
  ) => Promise<void> | void;
  readonly onTestCaseResult?: (
    test: Test,
    testCaseResult: TestCaseResult,
  ) => Promise<void> | void;
  readonly onRunStart: (
    results: AggregatedResult,
    options: ReporterOnStartOptions,
  ) => Promise<void> | void;
  readonly onTestStart?: (test: Test) => Promise<void> | void;
  readonly onTestFileStart?: (test: Test) => Promise<void> | void;
  readonly onRunComplete: (
    testContexts: Set<TestContext>,
    results: AggregatedResult,
  ) => Promise<void> | void;
  readonly getLastError: () => Error | void;
}

export declare type ReporterContext = {
  firstRun: boolean;
  previousSuccess: boolean;
  changedFiles?: Set<string>;
  sourcesRelatedToTestsInChangedFiles?: Set<string>;
  startRun?: (globalConfig: Config.GlobalConfig) => unknown;
};

export declare type ReporterOnStartOptions = {
  estimatedTime: number;
  showStatus: boolean;
};

export {SnapshotSummary};

export declare type SummaryOptions = {
  currentTestCases?: Array<{
    test: Test;
    testCaseResult: TestCaseResult;
  }>;
  estimatedTime?: number;
  roundTime?: boolean;
  width?: number;
  showSeed?: boolean;
  seed?: number;
};

export declare class SummaryReporter extends BaseReporter {
  private _estimatedTime;
  private readonly _globalConfig;
  private readonly _summaryThreshold;
  static readonly filename: string;
  constructor(
    globalConfig: Config.GlobalConfig,
    options?: SummaryReporterOptions,
  );
  private _validateOptions;
  private _write;
  onRunStart(
    aggregatedResults: AggregatedResult,
    options: ReporterOnStartOptions,
  ): void;
  onRunComplete(
    testContexts: Set<TestContext>,
    aggregatedResults: AggregatedResult,
  ): void;
  private _printSnapshotSummary;
  private _printSummary;
  private _getTestSummary;
}

export declare type SummaryReporterOptions = {
  summaryThreshold?: number;
};

export {Test};

export {TestCaseResult};

export {TestContext};

export {TestResult};

declare function trimAndFormatPath(
  pad: number,
  config: Config.ProjectConfig | Config.GlobalConfig,
  testPath: string,
  columns: number,
): string;

export declare const utils: {
  formatTestPath: typeof formatTestPath;
  getResultHeader: typeof getResultHeader;
  getSnapshotStatus: typeof getSnapshotStatus;
  getSnapshotSummary: typeof getSnapshotSummary;
  getSummary: typeof getSummary;
  printDisplayName: typeof printDisplayName;
  relativePath: typeof relativePath;
  trimAndFormatPath: typeof trimAndFormatPath;
};

export declare class VerboseReporter extends DefaultReporter {
  protected _globalConfig: Config.GlobalConfig;
  static readonly filename: string;
  constructor(globalConfig: Config.GlobalConfig);
  protected __wrapStdio(
    stream: NodeJS.WritableStream | NodeJS.WriteStream,
  ): void;
  static filterTestResults(
    testResults: Array<AssertionResult>,
  ): Array<AssertionResult>;
  static groupTestsBySuites(testResults: Array<AssertionResult>): Suite;
  onTestResult(
    test: Test,
    result: TestResult,
    aggregatedResults: AggregatedResult,
  ): void;
  private _logTestResults;
  private _logSuite;
  private _getIcon;
  private _logTest;
  private _logTests;
  private _logTodoOrPendingTest;
  private _logLine;
}

export {};
