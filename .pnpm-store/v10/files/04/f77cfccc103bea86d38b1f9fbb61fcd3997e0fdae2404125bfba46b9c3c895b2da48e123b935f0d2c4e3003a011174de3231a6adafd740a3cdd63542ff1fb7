/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {Config} from '@jest/types';
import type {SerializableError} from '@jest/test-result';
import {Test} from '@jest/test-result';
import {TestEvents} from '@jest/test-result';
import type {TestResult} from '@jest/test-result';
import {TestWatcher} from 'jest-watcher';

declare abstract class BaseTestRunner {
  protected readonly _globalConfig: Config.GlobalConfig;
  protected readonly _context: TestRunnerContext;
  readonly isSerial?: boolean;
  abstract readonly supportsEventEmitters: boolean;
  constructor(_globalConfig: Config.GlobalConfig, _context: TestRunnerContext);
}

export declare abstract class CallbackTestRunner
  extends BaseTestRunner
  implements CallbackTestRunnerInterface
{
  readonly supportsEventEmitters = false;
  abstract runTests(
    tests: Array<Test>,
    watcher: TestWatcher,
    onStart: OnTestStart,
    onResult: OnTestSuccess,
    onFailure: OnTestFailure,
    options: TestRunnerOptions,
  ): Promise<void>;
}

export declare interface CallbackTestRunnerInterface {
  readonly isSerial?: boolean;
  readonly supportsEventEmitters?: boolean;
  runTests(
    tests: Array<Test>,
    watcher: TestWatcher,
    onStart: OnTestStart,
    onResult: OnTestSuccess,
    onFailure: OnTestFailure,
    options: TestRunnerOptions,
  ): Promise<void>;
}

export {Config};

export declare abstract class EmittingTestRunner
  extends BaseTestRunner
  implements EmittingTestRunnerInterface
{
  readonly supportsEventEmitters = true;
  abstract runTests(
    tests: Array<Test>,
    watcher: TestWatcher,
    options: TestRunnerOptions,
  ): Promise<void>;
  abstract on<Name extends keyof TestEvents>(
    eventName: Name,
    listener: (eventData: TestEvents[Name]) => void | Promise<void>,
  ): UnsubscribeFn;
}

export declare interface EmittingTestRunnerInterface {
  readonly isSerial?: boolean;
  readonly supportsEventEmitters: true;
  runTests(
    tests: Array<Test>,
    watcher: TestWatcher,
    options: TestRunnerOptions,
  ): Promise<void>;
  on<Name extends keyof TestEvents>(
    eventName: Name,
    listener: (eventData: TestEvents[Name]) => void | Promise<void>,
  ): UnsubscribeFn;
}

export declare type JestTestRunner = CallbackTestRunner | EmittingTestRunner;

export declare type OnTestFailure = (
  test: Test,
  serializableError: SerializableError,
) => Promise<void>;

export declare type OnTestStart = (test: Test) => Promise<void>;

export declare type OnTestSuccess = (
  test: Test,
  testResult: TestResult,
) => Promise<void>;

export {Test};

export {TestEvents};

declare class TestRunner extends EmittingTestRunner {
  #private;
  runTests(
    tests: Array<Test>,
    watcher: TestWatcher,
    options: TestRunnerOptions,
  ): Promise<void>;
  on<Name extends keyof TestEvents>(
    eventName: Name,
    listener: (eventData: TestEvents[Name]) => void | Promise<void>,
  ): UnsubscribeFn;
}
export default TestRunner;

export declare type TestRunnerContext = {
  changedFiles?: Set<string>;
  sourcesRelatedToTestsInChangedFiles?: Set<string>;
};

export declare type TestRunnerOptions = {
  serial: boolean;
};

export {TestWatcher};

export declare type UnsubscribeFn = () => void;

export {};
