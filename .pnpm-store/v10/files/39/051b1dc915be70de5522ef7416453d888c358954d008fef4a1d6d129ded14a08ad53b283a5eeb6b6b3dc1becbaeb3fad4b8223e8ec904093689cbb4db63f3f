/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/// <reference types="node" />

import type {Config} from '@jest/types';
import {Console as Console_2} from 'console';
import {InspectOptions} from 'util';
import {StackTraceConfig} from 'jest-message-util';

export declare class BufferedConsole extends Console_2 {
  private readonly _buffer;
  private _counters;
  private _timers;
  private _groupDepth;
  Console: typeof Console_2;
  constructor();
  static write(
    this: void,
    buffer: ConsoleBuffer,
    type: LogType,
    message: LogMessage,
    level?: number | null,
  ): ConsoleBuffer;
  private _log;
  assert(value: unknown, message?: string | Error): void;
  count(label?: string): void;
  countReset(label?: string): void;
  debug(firstArg: unknown, ...rest: Array<unknown>): void;
  dir(firstArg: unknown, options?: InspectOptions): void;
  dirxml(firstArg: unknown, ...rest: Array<unknown>): void;
  error(firstArg: unknown, ...rest: Array<unknown>): void;
  group(title?: string, ...rest: Array<unknown>): void;
  groupCollapsed(title?: string, ...rest: Array<unknown>): void;
  groupEnd(): void;
  info(firstArg: unknown, ...rest: Array<unknown>): void;
  log(firstArg: unknown, ...rest: Array<unknown>): void;
  time(label?: string): void;
  timeEnd(label?: string): void;
  timeLog(label?: string, ...data: Array<unknown>): void;
  warn(firstArg: unknown, ...rest: Array<unknown>): void;
  getBuffer(): ConsoleBuffer | undefined;
}

export declare type ConsoleBuffer = Array<LogEntry>;

export declare class CustomConsole extends Console_2 {
  private readonly _stdout;
  private readonly _stderr;
  private readonly _formatBuffer;
  private _counters;
  private _timers;
  private _groupDepth;
  Console: typeof Console_2;
  constructor(
    stdout: NodeJS.WriteStream,
    stderr: NodeJS.WriteStream,
    formatBuffer?: Formatter,
  );
  private _log;
  private _logError;
  assert(value: unknown, message?: string | Error): asserts value;
  count(label?: string): void;
  countReset(label?: string): void;
  debug(firstArg: unknown, ...args: Array<unknown>): void;
  dir(firstArg: unknown, options?: InspectOptions): void;
  dirxml(firstArg: unknown, ...args: Array<unknown>): void;
  error(firstArg: unknown, ...args: Array<unknown>): void;
  group(title?: string, ...args: Array<unknown>): void;
  groupCollapsed(title?: string, ...args: Array<unknown>): void;
  groupEnd(): void;
  info(firstArg: unknown, ...args: Array<unknown>): void;
  log(firstArg: unknown, ...args: Array<unknown>): void;
  time(label?: string): void;
  timeEnd(label?: string): void;
  timeLog(label?: string, ...data: Array<unknown>): void;
  warn(firstArg: unknown, ...args: Array<unknown>): void;
  getBuffer(): undefined;
}

declare type Formatter = (type: LogType, message: LogMessage) => string;

export declare function getConsoleOutput(
  buffer: ConsoleBuffer,
  config: StackTraceConfig,
  globalConfig: Config.GlobalConfig,
): string;

export declare type LogEntry = {
  message: LogMessage;
  origin: string;
  type: LogType;
};

export declare type LogMessage = string;

export declare type LogType =
  | 'assert'
  | 'count'
  | 'debug'
  | 'dir'
  | 'dirxml'
  | 'error'
  | 'group'
  | 'groupCollapsed'
  | 'info'
  | 'log'
  | 'time'
  | 'warn';

export declare class NullConsole extends CustomConsole {
  assert(): void;
  debug(): void;
  dir(): void;
  error(): void;
  info(): void;
  log(): void;
  time(): void;
  timeEnd(): void;
  timeLog(): void;
  trace(): void;
  warn(): void;
  group(): void;
  groupCollapsed(): void;
  groupEnd(): void;
}

export {};
