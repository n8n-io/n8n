/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/// <reference types="node" />

import {Context} from 'vm';
import type {EnvironmentContext} from '@jest/environment';
import type {Global} from '@jest/types';
import type {JestEnvironment} from '@jest/environment';
import type {JestEnvironmentConfig} from '@jest/environment';
import {LegacyFakeTimers} from '@jest/fake-timers';
import {ModernFakeTimers} from '@jest/fake-timers';
import {ModuleMocker} from 'jest-mock';

declare class NodeEnvironment implements JestEnvironment<Timer> {
  context: Context | null;
  fakeTimers: LegacyFakeTimers<Timer> | null;
  fakeTimersModern: ModernFakeTimers | null;
  global: Global.Global;
  moduleMocker: ModuleMocker | null;
  customExportConditions: string[];
  private _configuredExportConditions?;
  constructor(config: JestEnvironmentConfig, _context: EnvironmentContext);
  setup(): Promise<void>;
  teardown(): Promise<void>;
  exportConditions(): Array<string>;
  getVmContext(): Context | null;
}
export default NodeEnvironment;

export declare const TestEnvironment: typeof NodeEnvironment;

declare type Timer = {
  id: number;
  ref: () => Timer;
  unref: () => Timer;
};

export {};
