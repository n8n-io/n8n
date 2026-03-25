/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/// <reference types="node" />

import type {AggregatedResult} from '@jest/test-result';
import type {Config} from '@jest/types';
import Emittery = require('emittery');

export declare type AllowedConfigOptions = Partial<
  Pick<
    Config.GlobalConfig,
    | 'bail'
    | 'changedSince'
    | 'collectCoverage'
    | 'collectCoverageFrom'
    | 'coverageDirectory'
    | 'coverageReporters'
    | 'findRelatedTests'
    | 'nonFlagArgs'
    | 'notify'
    | 'notifyMode'
    | 'onlyFailures'
    | 'reporters'
    | 'testNamePattern'
    | 'testPathPattern'
    | 'updateSnapshot'
    | 'verbose'
  > & {
    mode: 'watch' | 'watchAll';
  }
>;

declare type AvailableHooks =
  | 'onFileChange'
  | 'onTestRunComplete'
  | 'shouldRunTestSuite';

export declare abstract class BaseWatchPlugin implements WatchPlugin {
  protected _stdin: NodeJS.ReadStream;
  protected _stdout: NodeJS.WriteStream;
  constructor({
    stdin,
    stdout,
  }: {
    stdin: NodeJS.ReadStream;
    stdout: NodeJS.WriteStream;
  });
  apply(_hooks: JestHookSubscriber): void;
  getUsageInfo(_globalConfig: Config.GlobalConfig): UsageData | null;
  onKey(_key: string): void;
  run(
    _globalConfig: Config.GlobalConfig,
    _updateConfigAndRun: UpdateConfigCallback,
  ): Promise<void | boolean>;
}

declare type FileChange = (fs: JestHookExposedFS) => void;

export declare class JestHook {
  private readonly _listeners;
  private readonly _subscriber;
  private readonly _emitter;
  constructor();
  isUsed(hook: AvailableHooks): boolean;
  getSubscriber(): Readonly<JestHookSubscriber>;
  getEmitter(): Readonly<JestHookEmitter>;
}

export declare type JestHookEmitter = {
  onFileChange: (fs: JestHookExposedFS) => void;
  onTestRunComplete: (results: AggregatedResult) => void;
  shouldRunTestSuite: (
    testSuiteInfo: TestSuiteInfo,
  ) => Promise<boolean> | boolean;
};

declare type JestHookExposedFS = {
  projects: Array<{
    config: Config.ProjectConfig;
    testPaths: Array<string>;
  }>;
};

export declare type JestHookSubscriber = {
  onFileChange: (fn: FileChange) => void;
  onTestRunComplete: (fn: TestRunComplete) => void;
  shouldRunTestSuite: (fn: ShouldRunTestSuite) => void;
};

export declare const KEYS: {
  ARROW_DOWN: string;
  ARROW_LEFT: string;
  ARROW_RIGHT: string;
  ARROW_UP: string;
  BACKSPACE: string;
  CONTROL_C: string;
  CONTROL_D: string;
  CONTROL_U: string;
  ENTER: string;
  ESCAPE: string;
};

export declare abstract class PatternPrompt {
  protected _pipe: NodeJS.WritableStream;
  protected _prompt: Prompt;
  protected _entityName: string;
  protected _currentUsageRows: number;
  constructor(
    _pipe: NodeJS.WritableStream,
    _prompt: Prompt,
    _entityName?: string,
  );
  run(
    onSuccess: (value: string) => void,
    onCancel: () => void,
    options?: {
      header: string;
    },
  ): void;
  protected _onChange(_pattern: string, _options: ScrollOptions_2): void;
}

export declare function printPatternCaret(
  pattern: string,
  pipe: NodeJS.WritableStream,
): void;

export declare function printRestoredPatternCaret(
  pattern: string,
  currentUsageRows: number,
  pipe: NodeJS.WritableStream,
): void;

export declare class Prompt {
  private _entering;
  private _value;
  private _onChange;
  private _onSuccess;
  private _onCancel;
  private _offset;
  private _promptLength;
  private _selection;
  constructor();
  private readonly _onResize;
  enter(
    onChange: (pattern: string, options: ScrollOptions_2) => void,
    onSuccess: (pattern: string) => void,
    onCancel: () => void,
  ): void;
  setPromptLength(length: number): void;
  setPromptSelection(selected: string): void;
  put(key: string): void;
  abort(): void;
  isEntering(): boolean;
}

declare type ScrollOptions_2 = {
  offset: number;
  max: number;
};
export {ScrollOptions_2 as ScrollOptions};

declare type ShouldRunTestSuite = (
  testSuiteInfo: TestSuiteInfo,
) => Promise<boolean>;

declare type State = {
  interrupted: boolean;
};

declare type TestRunComplete = (results: AggregatedResult) => void;

declare type TestSuiteInfo = {
  config: Config.ProjectConfig;
  duration?: number;
  testPath: string;
};

export declare class TestWatcher extends Emittery<{
  change: State;
}> {
  state: State;
  private readonly _isWatchMode;
  constructor({isWatchMode}: {isWatchMode: boolean});
  setState(state: State): Promise<void>;
  isInterrupted(): boolean;
  isWatchMode(): boolean;
}

export declare type UpdateConfigCallback = (
  config?: AllowedConfigOptions,
) => void;

export declare type UsageData = {
  key: string;
  prompt: string;
};

export declare interface WatchPlugin {
  isInternal?: boolean;
  apply?: (hooks: JestHookSubscriber) => void;
  getUsageInfo?: (globalConfig: Config.GlobalConfig) => UsageData | null;
  onKey?: (value: string) => void;
  run?: (
    globalConfig: Config.GlobalConfig,
    updateConfigAndRun: UpdateConfigCallback,
  ) => Promise<void | boolean>;
}

export declare interface WatchPluginClass {
  new (options: {
    config: Record<string, unknown>;
    stdin: NodeJS.ReadStream;
    stdout: NodeJS.WriteStream;
  }): WatchPlugin;
}

export {};
