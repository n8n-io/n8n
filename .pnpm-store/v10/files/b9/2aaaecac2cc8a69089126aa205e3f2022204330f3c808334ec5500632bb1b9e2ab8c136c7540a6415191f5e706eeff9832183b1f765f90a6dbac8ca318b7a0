/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type {Config} from '@jest/types';
import type {Options} from 'yargs';

export declare const createDidYouMeanMessage: (
  unrecognized: string,
  allowedOptions: Array<string>,
) => string;

declare type DeprecatedOptionFunc = (arg: Record<string, unknown>) => string;

export declare type DeprecatedOptions = Record<string, DeprecatedOptionFunc>;

export declare const format: (value: unknown) => string;

export declare const logValidationWarning: (
  name: string,
  message: string,
  comment?: string | null,
) => void;

export declare function multipleValidOptions<T extends Array<unknown>>(
  ...args: T
): T[number];

declare type Title = {
  deprecation?: string;
  error?: string;
  warning?: string;
};

export declare const validate: (
  config: Record<string, unknown>,
  options: ValidationOptions,
) => {
  hasDeprecationWarnings: boolean;
  isValid: boolean;
};

export declare function validateCLIOptions(
  argv: Config.Argv,
  options?: Record<string, Options> & {
    deprecationEntries?: DeprecatedOptions;
  },
  rawArgv?: Array<string>,
): boolean;

export declare class ValidationError extends Error {
  name: string;
  message: string;
  constructor(name: string, message: string, comment?: string | null);
}

declare type ValidationOptions = {
  comment?: string;
  condition?: (option: unknown, validOption: unknown) => boolean;
  deprecate?: (
    config: Record<string, unknown>,
    option: string,
    deprecatedOptions: DeprecatedOptions,
    options: ValidationOptions,
  ) => boolean;
  deprecatedConfig?: DeprecatedOptions;
  error?: (
    option: string,
    received: unknown,
    defaultValue: unknown,
    options: ValidationOptions,
    path?: Array<string>,
  ) => void;
  exampleConfig: Record<string, unknown>;
  recursive?: boolean;
  recursiveDenylist?: Array<string>;
  title?: Title;
  unknown?: (
    config: Record<string, unknown>,
    exampleConfig: Record<string, unknown>,
    option: string,
    options: ValidationOptions,
    path?: Array<string>,
  ) => void;
};

export {};
