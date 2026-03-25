/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/// <reference types="node" />

import type {Config} from '@jest/types';
import type {Global} from '@jest/types';

declare const ARROW = ' \u203A ';

declare const CLEAR: string;

export declare function clearLine(stream: NodeJS.WriteStream): void;

export declare function convertDescriptorToString(
  descriptor: Global.BlockNameLike | undefined,
): string;

export declare function createDirectory(path: string): void;

export declare function deepCyclicCopy<T>(
  value: T,
  options?: DeepCyclicCopyOptions,
  cycles?: WeakMap<any, any>,
): T;

declare type DeepCyclicCopyOptions = {
  blacklist?: Set<string>;
  keepPrototype?: boolean;
};

export declare class ErrorWithStack extends Error {
  constructor(
    message: string | undefined,
    callsite: (...args: Array<any>) => unknown,
    stackLimit?: number,
  );
}

export declare function formatTime(
  time: number,
  prefixPower?: number,
  padLeftLength?: number,
): string;

/**
 * Converts a list of globs into a function that matches a path against the
 * globs.
 *
 * Every time picomatch is called, it will parse the glob strings and turn
 * them into regexp instances. Instead of calling picomatch repeatedly with
 * the same globs, we can use this function which will build the picomatch
 * matchers ahead of time and then have an optimized path for determining
 * whether an individual path matches.
 *
 * This function is intended to match the behavior of `micromatch()`.
 *
 * @example
 * const isMatch = globsToMatcher(['*.js', '!*.test.js']);
 * isMatch('pizza.js'); // true
 * isMatch('pizza.test.js'); // false
 */
export declare function globsToMatcher(globs: Array<string>): Matcher;

declare const ICONS: {
  failed: string;
  pending: string;
  success: string;
  todo: string;
};

export declare function installCommonGlobals(
  globalObject: typeof globalThis,
  globals: Config.ConfigGlobals,
): typeof globalThis & Config.ConfigGlobals;

export declare function interopRequireDefault(obj: any): any;

export declare function invariant(
  condition: unknown,
  message?: string,
): asserts condition;

export declare const isInteractive: boolean;

export declare function isNonNullable<T>(value: T): value is NonNullable<T>;

export declare function isPromise<T = unknown>(
  candidate: unknown,
): candidate is PromiseLike<T>;

declare type Matcher = (str: string) => boolean;

export declare function pluralize(
  word: string,
  count: number,
  ending?: string,
): string;

declare namespace preRunMessage {
  export {print_2 as print, remove};
}
export {preRunMessage};

declare function print_2(stream: NodeJS.WriteStream): void;

declare function remove(stream: NodeJS.WriteStream): void;

export declare function replacePathSepForGlob(path: string): string;

export declare function requireOrImportModule<T>(
  filePath: string,
  applyInteropRequireDefault?: boolean,
): Promise<T>;

export declare function setGlobal(
  globalToMutate: typeof globalThis | Global.Global,
  key: string,
  value: unknown,
): void;

declare namespace specialChars {
  export {ARROW, ICONS, CLEAR};
}
export {specialChars};

export declare function testPathPatternToRegExp(
  testPathPattern: Config.GlobalConfig['testPathPattern'],
): RegExp;

export declare function tryRealpath(path: string): string;

export {};
