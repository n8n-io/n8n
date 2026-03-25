/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {AggregatedResult} from '@jest/test-result';
import {BaseReporter} from '@jest/reporters';
import type {ChangedFiles} from 'jest-changed-files';
import type {Config} from '@jest/types';
import {Reporter} from '@jest/reporters';
import {ReporterContext} from '@jest/reporters';
import {Test} from '@jest/test-result';
import type {TestContext} from '@jest/test-result';
import type {TestRunnerContext} from 'jest-runner';
import type {TestWatcher} from 'jest-watcher';

export declare function createTestScheduler(
  globalConfig: Config.GlobalConfig,
  context: TestSchedulerContext,
): Promise<TestScheduler>;

declare type Filter = (testPaths: Array<string>) => Promise<{
  filtered: Array<FilterResult>;
}>;

declare type FilterResult = {
  test: string;
  message: string;
};

export declare function getVersion(): string;

declare type ReporterConstructor = new (
  globalConfig: Config.GlobalConfig,
  reporterConfig: Record<string, unknown>,
  reporterContext: ReporterContext,
) => BaseReporter;

export declare function runCLI(
  argv: Config.Argv,
  projects: Array<string>,
): Promise<{
  results: AggregatedResult;
  globalConfig: Config.GlobalConfig;
}>;

declare type SearchResult = {
  noSCM?: boolean;
  stats?: Stats;
  collectCoverageFrom?: Set<string>;
  tests: Array<Test>;
  total?: number;
};

export declare class SearchSource {
  private readonly _context;
  private _dependencyResolver;
  private readonly _testPathCases;
  constructor(context: TestContext);
  private _getOrBuildDependencyResolver;
  private _filterTestPathsWithStats;
  private _getAllTestPaths;
  isTestFilePath(path: string): boolean;
  findMatchingTests(testPathPattern: string): SearchResult;
  findRelatedTests(
    allPaths: Set<string>,
    collectCoverage: boolean,
  ): Promise<SearchResult>;
  findTestsByPaths(paths: Array<string>): SearchResult;
  findRelatedTestsFromPattern(
    paths: Array<string>,
    collectCoverage: boolean,
  ): Promise<SearchResult>;
  findTestRelatedToChangedFiles(
    changedFilesInfo: ChangedFiles,
    collectCoverage: boolean,
  ): Promise<SearchResult>;
  private _getTestPaths;
  filterPathsWin32(paths: Array<string>): Array<string>;
  getTestPaths(
    globalConfig: Config.GlobalConfig,
    changedFiles?: ChangedFiles,
    filter?: Filter,
  ): Promise<SearchResult>;
  findRelatedSourcesFromTestsInChangedFiles(
    changedFilesInfo: ChangedFiles,
  ): Promise<Array<string>>;
}

declare type Stats = {
  roots: number;
  testMatch: number;
  testPathIgnorePatterns: number;
  testRegex: number;
  testPathPattern?: number;
};

declare class TestScheduler {
  private readonly _context;
  private readonly _dispatcher;
  private readonly _globalConfig;
  constructor(globalConfig: Config.GlobalConfig, context: TestSchedulerContext);
  addReporter(reporter: Reporter): void;
  removeReporter(reporterConstructor: ReporterConstructor): void;
  scheduleTests(
    tests: Array<Test>,
    watcher: TestWatcher,
  ): Promise<AggregatedResult>;
  private _partitionTests;
  _setupReporters(): Promise<void>;
  private _addCustomReporter;
  private _bailIfNeeded;
}

declare type TestSchedulerContext = ReporterContext & TestRunnerContext;

export {};
