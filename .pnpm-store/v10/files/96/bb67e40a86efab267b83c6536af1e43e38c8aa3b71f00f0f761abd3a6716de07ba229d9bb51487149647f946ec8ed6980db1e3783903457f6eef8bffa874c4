/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/// <reference types="node" />

import type {Context} from 'vm';
import type {EnvironmentContext} from '@jest/environment';
import type {Global} from '@jest/types';
import type {JestEnvironment} from '@jest/environment';
import type {JestEnvironmentConfig} from '@jest/environment';
import {JSDOM} from 'jsdom';
import {LegacyFakeTimers} from '@jest/fake-timers';
import {ModernFakeTimers} from '@jest/fake-timers';
import {ModuleMocker} from 'jest-mock';

declare class JSDOMEnvironment implements JestEnvironment<number> {
  dom: JSDOM | null;
  fakeTimers: LegacyFakeTimers<number> | null;
  fakeTimersModern: ModernFakeTimers | null;
  global: Win;
  private errorEventListener;
  moduleMocker: ModuleMocker | null;
  customExportConditions: string[];
  private _configuredExportConditions?;
  constructor(config: JestEnvironmentConfig, context: EnvironmentContext);
  setup(): Promise<void>;
  teardown(): Promise<void>;
  exportConditions(): Array<string>;
  getVmContext(): Context | null;
}
export default JSDOMEnvironment;

export declare const TestEnvironment: typeof JSDOMEnvironment;

declare type Win = Window &
  Global.Global & {
    Error: {
      stackTraceLimit: number;
    };
  };

export {};
