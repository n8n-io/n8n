/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/// <reference types="node" />

import type {Circus} from '@jest/types';
import type {Config} from '@jest/types';
import type {Context} from 'vm';
import type {Global} from '@jest/types';
import type {LegacyFakeTimers} from '@jest/fake-timers';
import type {Mocked} from 'jest-mock';
import type {ModernFakeTimers} from '@jest/fake-timers';
import type {ModuleMocker} from 'jest-mock';

export declare type EnvironmentContext = {
  console: Console;
  docblockPragmas: Record<string, string | Array<string>>;
  testPath: string;
};

export declare interface Jest {
  /**
   * Advances all timers by `msToRun` milliseconds. All pending "macro-tasks"
   * that have been queued via `setTimeout()` or `setInterval()`, and would be
   * executed within this time frame will be executed.
   */
  advanceTimersByTime(msToRun: number): void;
  /**
   * Advances all timers by `msToRun` milliseconds, firing callbacks if necessary.
   *
   * @remarks
   * Not available when using legacy fake timers implementation.
   */
  advanceTimersByTimeAsync(msToRun: number): Promise<void>;
  /**
   * Advances all timers by the needed milliseconds so that only the next
   * timeouts/intervals will run. Optionally, you can provide steps, so it will
   * run steps amount of next timeouts/intervals.
   */
  advanceTimersToNextTimer(steps?: number): void;
  /**
   * Advances the clock to the the moment of the first scheduled timer, firing it.
   * Optionally, you can provide steps, so it will run steps amount of
   * next timeouts/intervals.
   *
   * @remarks
   * Not available when using legacy fake timers implementation.
   */
  advanceTimersToNextTimerAsync(steps?: number): Promise<void>;
  /**
   * Disables automatic mocking in the module loader.
   */
  autoMockOff(): Jest;
  /**
   * Enables automatic mocking in the module loader.
   */
  autoMockOn(): Jest;
  /**
   * Clears the `mock.calls`, `mock.instances`, `mock.contexts` and `mock.results` properties of
   * all mocks. Equivalent to calling `.mockClear()` on every mocked function.
   */
  clearAllMocks(): Jest;
  /**
   * Removes any pending timers from the timer system. If any timers have been
   * scheduled, they will be cleared and will never have the opportunity to
   * execute in the future.
   */
  clearAllTimers(): void;
  /**
   * Given the name of a module, use the automatic mocking system to generate a
   * mocked version of the module for you.
   *
   * This is useful when you want to create a manual mock that extends the
   * automatic mock's behavior.
   */
  createMockFromModule<T = unknown>(moduleName: string): Mocked<T>;
  /**
   * Indicates that the module system should never return a mocked version of
   * the specified module and its dependencies.
   */
  deepUnmock(moduleName: string): Jest;
  /**
   * Disables automatic mocking in the module loader.
   *
   * After this method is called, all `require()`s will return the real
   * versions of each module (rather than a mocked version).
   */
  disableAutomock(): Jest;
  /**
   * When using `babel-jest`, calls to `jest.mock()` will automatically be hoisted
   * to the top of the code block. Use this method if you want to explicitly
   * avoid this behavior.
   */
  doMock<T = unknown>(
    moduleName: string,
    moduleFactory?: () => T,
    options?: {
      virtual?: boolean;
    },
  ): Jest;
  /**
   * When using `babel-jest`, calls to `jest.unmock()` will automatically be hoisted
   * to the top of the code block. Use this method if you want to explicitly
   * avoid this behavior.
   */
  dontMock(moduleName: string): Jest;
  /**
   * Enables automatic mocking in the module loader.
   */
  enableAutomock(): Jest;
  /**
   * Creates a mock function. Optionally takes a mock implementation.
   */
  fn: ModuleMocker['fn'];
  /**
   * Given the name of a module, use the automatic mocking system to generate a
   * mocked version of the module for you.
   *
   * This is useful when you want to create a manual mock that extends the
   * automatic mock's behavior.
   *
   * @deprecated Use `jest.createMockFromModule()` instead
   */
  genMockFromModule<T = unknown>(moduleName: string): Mocked<T>;
  /**
   * When mocking time, `Date.now()` will also be mocked. If you for some reason
   * need access to the real current time, you can invoke this function.
   *
   * @remarks
   * Not available when using legacy fake timers implementation.
   */
  getRealSystemTime(): number;
  /**
   * Retrieves the seed value. It will be randomly generated for each test run
   * or can be manually set via the `--seed` CLI argument.
   */
  getSeed(): number;
  /**
   * Returns the number of fake timers still left to run.
   */
  getTimerCount(): number;
  /**
   * Returns `true` if test environment has been torn down.
   *
   * @example
   * ```js
   * if (jest.isEnvironmentTornDown()) {
   *   // The Jest environment has been torn down, so stop doing work
   *   return;
   * }
   * ```
   */
  isEnvironmentTornDown(): boolean;
  /**
   * Determines if the given function is a mocked function.
   */
  isMockFunction: ModuleMocker['isMockFunction'];
  /**
   * `jest.isolateModules()` goes a step further than `jest.resetModules()` and
   * creates a sandbox registry for the modules that are loaded inside the callback
   * function. This is useful to isolate specific modules for every test so that
   * local module state doesn't conflict between tests.
   */
  isolateModules(fn: () => void): Jest;
  /**
   * `jest.isolateModulesAsync()` is the equivalent of `jest.isolateModules()`, but for
   * async functions to be wrapped. The caller is expected to `await` the completion of
   * `isolateModulesAsync`.
   */
  isolateModulesAsync(fn: () => Promise<void>): Promise<void>;
  /**
   * Mocks a module with an auto-mocked version when it is being required.
   */
  mock<T = unknown>(
    moduleName: string,
    moduleFactory?: () => T,
    options?: {
      virtual?: boolean;
    },
  ): Jest;
  /**
   * Mocks a module with the provided module factory when it is being imported.
   */
  unstable_mockModule<T = unknown>(
    moduleName: string,
    moduleFactory: () => T | Promise<T>,
    options?: {
      virtual?: boolean;
    },
  ): Jest;
  /**
   * Wraps types of the `source` object and its deep members with type definitions
   * of Jest mock function. Pass `{shallow: true}` option to disable the deeply
   * mocked behavior.
   */
  mocked: ModuleMocker['mocked'];
  /**
   * Returns the current time in ms of the fake timer clock.
   */
  now(): number;
  /**
   * Replaces property on an object with another value.
   *
   * @remarks
   * For mocking functions or 'get' or 'set' accessors, use `jest.spyOn()` instead.
   */
  replaceProperty: ModuleMocker['replaceProperty'];
  /**
   * Returns the actual module instead of a mock, bypassing all checks on
   * whether the module should receive a mock implementation or not.
   *
   * @example
   * ```js
   * jest.mock('../myModule', () => {
   *   // Require the original module to not be mocked...
   *   const originalModule = jest.requireActual('../myModule');
   *
   *   return {
   *     __esModule: true, // Use it when dealing with esModules
   *     ...originalModule,
   *     getRandom: jest.fn().mockReturnValue(10),
   *   };
   * });
   *
   * const getRandom = require('../myModule').getRandom;
   *
   * getRandom(); // Always returns 10
   * ```
   */
  requireActual<T = unknown>(moduleName: string): T;
  /**
   * Returns a mock module instead of the actual module, bypassing all checks
   * on whether the module should be required normally or not.
   */
  requireMock<T = unknown>(moduleName: string): T;
  /**
   * Resets the state of all mocks. Equivalent to calling `.mockReset()` on
   * every mocked function.
   */
  resetAllMocks(): Jest;
  /**
   * Resets the module registry - the cache of all required modules. This is
   * useful to isolate modules where local state might conflict between tests.
   */
  resetModules(): Jest;
  /**
   * Restores all mocks and replaced properties back to their original value.
   * Equivalent to calling `.mockRestore()` on every mocked function
   * and `.restore()` on every replaced property.
   *
   * Beware that `jest.restoreAllMocks()` only works when the mock was created
   * with `jest.spyOn()`; other mocks will require you to manually restore them.
   */
  restoreAllMocks(): Jest;
  /**
   * Runs failed tests n-times until they pass or until the max number of
   * retries is exhausted.
   *
   * If `logErrorsBeforeRetry` is enabled, Jest will log the error(s) that caused
   * the test to fail to the console, providing visibility on why a retry occurred.
   * retries is exhausted.
   *
   * @remarks
   * Only available with `jest-circus` runner.
   */
  retryTimes(
    numRetries: number,
    options?: {
      logErrorsBeforeRetry?: boolean;
    },
  ): Jest;
  /**
   * Exhausts tasks queued by `setImmediate()`.
   *
   * @remarks
   * Only available when using legacy fake timers implementation.
   */
  runAllImmediates(): void;
  /**
   * Exhausts the micro-task queue (usually interfaced in node via
   * `process.nextTick()`).
   */
  runAllTicks(): void;
  /**
   * Exhausts the macro-task queue (i.e., all tasks queued by `setTimeout()`
   * and `setInterval()`).
   */
  runAllTimers(): void;
  /**
   * Exhausts the macro-task queue (i.e., all tasks queued by `setTimeout()`
   * and `setInterval()`).
   *
   * @remarks
   * If new timers are added while it is executing they will be run as well.
   * @remarks
   * Not available when using legacy fake timers implementation.
   */
  runAllTimersAsync(): Promise<void>;
  /**
   * Executes only the macro-tasks that are currently pending (i.e., only the
   * tasks that have been queued by `setTimeout()` or `setInterval()` up to this
   * point). If any of the currently pending macro-tasks schedule new
   * macro-tasks, those new tasks will not be executed by this call.
   */
  runOnlyPendingTimers(): void;
  /**
   * Executes only the macro-tasks that are currently pending (i.e., only the
   * tasks that have been queued by `setTimeout()` or `setInterval()` up to this
   * point). If any of the currently pending macro-tasks schedule new
   * macro-tasks, those new tasks will not be executed by this call.
   *
   * @remarks
   * Not available when using legacy fake timers implementation.
   */
  runOnlyPendingTimersAsync(): Promise<void>;
  /**
   * Explicitly supplies the mock object that the module system should return
   * for the specified module.
   *
   * @remarks
   * It is recommended to use `jest.mock()` instead. The `jest.mock()` API's second
   * argument is a module factory instead of the expected exported module object.
   */
  setMock(moduleName: string, moduleExports: unknown): Jest;
  /**
   * Set the current system time used by fake timers. Simulates a user changing
   * the system clock while your program is running. It affects the current time,
   * but it does not in itself cause e.g. timers to fire; they will fire exactly
   * as they would have done without the call to `jest.setSystemTime()`.
   *
   * @remarks
   * Not available when using legacy fake timers implementation.
   */
  setSystemTime(now?: number | Date): void;
  /**
   * Set the default timeout interval for tests and before/after hooks in
   * milliseconds.
   *
   * @remarks
   * The default timeout interval is 5 seconds if this method is not called.
   */
  setTimeout(timeout: number): Jest;
  /**
   * Creates a mock function similar to `jest.fn()` but also tracks calls to
   * `object[methodName]`.
   *
   * Optional third argument of `accessType` can be either 'get' or 'set', which
   * proves to be useful when you want to spy on a getter or a setter, respectively.
   *
   * @remarks
   * By default, `jest.spyOn()` also calls the spied method. This is different
   * behavior from most other test libraries.
   */
  spyOn: ModuleMocker['spyOn'];
  /**
   * Indicates that the module system should never return a mocked version of
   * the specified module from `require()` (e.g. that it should always return the
   * real module).
   */
  unmock(moduleName: string): Jest;
  /**
   * Instructs Jest to use fake versions of the global date, performance,
   * time and timer APIs. Fake timers implementation is backed by
   * [`@sinonjs/fake-timers`](https://github.com/sinonjs/fake-timers).
   *
   * @remarks
   * Calling `jest.useFakeTimers()` once again in the same test file would reinstall
   * fake timers using the provided options.
   */
  useFakeTimers(
    fakeTimersConfig?: Config.FakeTimersConfig | Config.LegacyFakeTimersConfig,
  ): Jest;
  /**
   * Instructs Jest to restore the original implementations of the global date,
   * performance, time and timer APIs.
   */
  useRealTimers(): Jest;
}

export declare class JestEnvironment<Timer = unknown> {
  constructor(config: JestEnvironmentConfig, context: EnvironmentContext);
  global: Global.Global;
  fakeTimers: LegacyFakeTimers<Timer> | null;
  fakeTimersModern: ModernFakeTimers | null;
  moduleMocker: ModuleMocker | null;
  getVmContext(): Context | null;
  setup(): Promise<void>;
  teardown(): Promise<void>;
  handleTestEvent?: Circus.EventHandler;
  exportConditions?: () => Array<string>;
}

export declare interface JestEnvironmentConfig {
  projectConfig: Config.ProjectConfig;
  globalConfig: Config.GlobalConfig;
}

export declare interface JestImportMeta extends ImportMeta {
  jest: Jest;
}

export declare type Module = NodeModule;

export declare type ModuleWrapper = (
  this: Module['exports'],
  module: Module,
  exports: Module['exports'],
  require: Module['require'],
  __dirname: string,
  __filename: Module['filename'],
  jest?: Jest,
  ...sandboxInjectedGlobals: Array<Global.Global[keyof Global.Global]>
) => unknown;

export {};
