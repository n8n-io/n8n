/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type {Config} from '@jest/types';
import type {ModuleMocker} from 'jest-mock';
import {StackTraceConfig} from 'jest-message-util';

declare type Callback = (...args: Array<unknown>) => void;

export declare class LegacyFakeTimers<TimerRef = unknown> {
  private _cancelledTicks;
  private readonly _config;
  private _disposed;
  private _fakeTimerAPIs;
  private _fakingTime;
  private _global;
  private _immediates;
  private readonly _maxLoops;
  private readonly _moduleMocker;
  private _now;
  private _ticks;
  private readonly _timerAPIs;
  private _timers;
  private _uuidCounter;
  private readonly _timerConfig;
  constructor({
    global,
    moduleMocker,
    timerConfig,
    config,
    maxLoops,
  }: {
    global: typeof globalThis;
    moduleMocker: ModuleMocker;
    timerConfig: TimerConfig<TimerRef>;
    config: StackTraceConfig;
    maxLoops?: number;
  });
  clearAllTimers(): void;
  dispose(): void;
  reset(): void;
  now(): number;
  runAllTicks(): void;
  runAllImmediates(): void;
  private _runImmediate;
  runAllTimers(): void;
  runOnlyPendingTimers(): void;
  advanceTimersToNextTimer(steps?: number): void;
  advanceTimersByTime(msToRun: number): void;
  runWithRealTimers(cb: Callback): void;
  useRealTimers(): void;
  useFakeTimers(): void;
  getTimerCount(): number;
  private _checkFakeTimers;
  private _createMocks;
  private _fakeClearTimer;
  private _fakeClearImmediate;
  private _fakeNextTick;
  private _fakeRequestAnimationFrame;
  private _fakeSetImmediate;
  private _fakeSetInterval;
  private _fakeSetTimeout;
  private _getNextTimerHandleAndExpiry;
  private _runTimerHandle;
}

export declare class ModernFakeTimers {
  private _clock;
  private readonly _config;
  private _fakingTime;
  private readonly _global;
  private readonly _fakeTimers;
  constructor({
    global,
    config,
  }: {
    global: typeof globalThis;
    config: Config.ProjectConfig;
  });
  clearAllTimers(): void;
  dispose(): void;
  runAllTimers(): void;
  runAllTimersAsync(): Promise<void>;
  runOnlyPendingTimers(): void;
  runOnlyPendingTimersAsync(): Promise<void>;
  advanceTimersToNextTimer(steps?: number): void;
  advanceTimersToNextTimerAsync(steps?: number): Promise<void>;
  advanceTimersByTime(msToRun: number): void;
  advanceTimersByTimeAsync(msToRun: number): Promise<void>;
  runAllTicks(): void;
  useRealTimers(): void;
  useFakeTimers(fakeTimersConfig?: Config.FakeTimersConfig): void;
  reset(): void;
  setSystemTime(now?: number | Date): void;
  getRealSystemTime(): number;
  now(): number;
  getTimerCount(): number;
  private _checkFakeTimers;
  private _toSinonFakeTimersConfig;
}

declare type TimerConfig<Ref> = {
  idToRef: (id: number) => Ref;
  refToId: (ref: Ref) => number | void;
};

export {};
