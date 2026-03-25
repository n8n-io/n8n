/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type {Config} from '@jest/types';
import type {MatcherContext} from 'expect';
import type {MatcherFunctionWithContext} from 'expect';
import {Plugin as Plugin_2} from 'pretty-format';
import {Plugins} from 'pretty-format';
import type {PrettyFormatOptions} from 'pretty-format';

export declare const addSerializer: (plugin: Plugin_2) => void;

export declare const buildSnapshotResolver: (
  config: Config.ProjectConfig,
  localRequire?: Promise<LocalRequire> | LocalRequire,
) => Promise<SnapshotResolver>;

export declare const cleanup: (
  fileSystem: FileSystem_2,
  update: Config.SnapshotUpdateState,
  snapshotResolver: SnapshotResolver,
  testPathIgnorePatterns?: Config.ProjectConfig['testPathIgnorePatterns'],
) => {
  filesRemoved: number;
  filesRemovedList: Array<string>;
};

export declare interface Context extends MatcherContext {
  snapshotState: SnapshotState;
}

export declare const EXTENSION = 'snap';

declare interface FileSystem_2 {
  exists(path: string): boolean;
  matchFiles(pattern: RegExp | string): Array<string>;
}

export declare const getSerializers: () => Plugins;

export declare const isSnapshotPath: (path: string) => boolean;

declare type LocalRequire = (module: string) => unknown;

declare type SaveStatus = {
  deleted: boolean;
  saved: boolean;
};

declare type SnapshotFormat = Omit<PrettyFormatOptions, 'compareKeys'>;

export declare interface SnapshotMatchers<R extends void | Promise<void>, T> {
  /**
   * This ensures that a value matches the most recent snapshot with property matchers.
   * Check out [the Snapshot Testing guide](https://jestjs.io/docs/snapshot-testing) for more information.
   */
  toMatchSnapshot(hint?: string): R;
  /**
   * This ensures that a value matches the most recent snapshot.
   * Check out [the Snapshot Testing guide](https://jestjs.io/docs/snapshot-testing) for more information.
   */
  toMatchSnapshot<U extends Record<keyof T, unknown>>(
    propertyMatchers: Partial<U>,
    hint?: string,
  ): R;
  /**
   * This ensures that a value matches the most recent snapshot with property matchers.
   * Instead of writing the snapshot value to a .snap file, it will be written into the source code automatically.
   * Check out [the Snapshot Testing guide](https://jestjs.io/docs/snapshot-testing) for more information.
   */
  toMatchInlineSnapshot(snapshot?: string): R;
  /**
   * This ensures that a value matches the most recent snapshot with property matchers.
   * Instead of writing the snapshot value to a .snap file, it will be written into the source code automatically.
   * Check out [the Snapshot Testing guide](https://jestjs.io/docs/snapshot-testing) for more information.
   */
  toMatchInlineSnapshot<U extends Record<keyof T, unknown>>(
    propertyMatchers: Partial<U>,
    snapshot?: string,
  ): R;
  /**
   * Used to test that a function throws a error matching the most recent snapshot when it is called.
   */
  toThrowErrorMatchingSnapshot(hint?: string): R;
  /**
   * Used to test that a function throws a error matching the most recent snapshot when it is called.
   * Instead of writing the snapshot value to a .snap file, it will be written into the source code automatically.
   */
  toThrowErrorMatchingInlineSnapshot(snapshot?: string): R;
}

declare type SnapshotMatchOptions = {
  readonly testName: string;
  readonly received: unknown;
  readonly key?: string;
  readonly inlineSnapshot?: string;
  readonly isInline: boolean;
  readonly error?: Error;
};

export declare type SnapshotResolver = {
  /** Resolves from `testPath` to snapshot path. */
  resolveSnapshotPath(testPath: string, snapshotExtension?: string): string;
  /** Resolves from `snapshotPath` to test path. */
  resolveTestPath(snapshotPath: string, snapshotExtension?: string): string;
  /** Example test path, used for preflight consistency check of the implementation above. */
  testPathForConsistencyCheck: string;
};

declare type SnapshotReturnOptions = {
  readonly actual: string;
  readonly count: number;
  readonly expected?: string;
  readonly key: string;
  readonly pass: boolean;
};

export declare class SnapshotState {
  private _counters;
  private _dirty;
  private _index;
  private readonly _updateSnapshot;
  private _snapshotData;
  private readonly _initialData;
  private readonly _snapshotPath;
  private _inlineSnapshots;
  private readonly _uncheckedKeys;
  private readonly _prettierPath;
  private readonly _rootDir;
  readonly snapshotFormat: SnapshotFormat;
  added: number;
  expand: boolean;
  matched: number;
  unmatched: number;
  updated: number;
  constructor(snapshotPath: string, options: SnapshotStateOptions);
  markSnapshotsAsCheckedForTest(testName: string): void;
  private _addSnapshot;
  clear(): void;
  save(): SaveStatus;
  getUncheckedCount(): number;
  getUncheckedKeys(): Array<string>;
  removeUncheckedKeys(): void;
  match({
    testName,
    received,
    key,
    inlineSnapshot,
    isInline,
    error,
  }: SnapshotMatchOptions): SnapshotReturnOptions;
  fail(testName: string, _received: unknown, key?: string): string;
}

declare type SnapshotStateOptions = {
  readonly updateSnapshot: Config.SnapshotUpdateState;
  readonly prettierPath?: string | null;
  readonly expand?: boolean;
  readonly snapshotFormat: SnapshotFormat;
  readonly rootDir: string;
};

export declare const toMatchInlineSnapshot: MatcherFunctionWithContext<
  Context,
  [propertiesOrSnapshot?: object | string, inlineSnapshot?: string]
>;

export declare const toMatchSnapshot: MatcherFunctionWithContext<
  Context,
  [propertiesOrHint?: object | string, hint?: string]
>;

export declare const toThrowErrorMatchingInlineSnapshot: MatcherFunctionWithContext<
  Context,
  [inlineSnapshot?: string, fromPromise?: boolean]
>;

export declare const toThrowErrorMatchingSnapshot: MatcherFunctionWithContext<
  Context,
  [hint?: string, fromPromise?: boolean]
>;

export {};
