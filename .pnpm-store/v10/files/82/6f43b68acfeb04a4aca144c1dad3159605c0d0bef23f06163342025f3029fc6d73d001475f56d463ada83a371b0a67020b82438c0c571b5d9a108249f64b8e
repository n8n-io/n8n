/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import chalk = require('chalk');
import {DiffOptions as DiffOptions_2} from 'jest-diff';

export declare const BOLD_WEIGHT: chalk.Chalk;

export declare const diff: (
  a: unknown,
  b: unknown,
  options?: DiffOptions,
) => string | null;

export declare type DiffOptions = DiffOptions_2;

export declare const DIM_COLOR: chalk.Chalk;

/**
 * Ensures that `actual` is of type `number | bigint`
 */
export declare const ensureActualIsNumber: (
  actual: unknown,
  matcherName: string,
  options?: MatcherHintOptions,
) => void;

export declare const ensureExpectedIsNonNegativeInteger: (
  expected: unknown,
  matcherName: string,
  options?: MatcherHintOptions,
) => void;

/**
 * Ensures that `expected` is of type `number | bigint`
 */
export declare const ensureExpectedIsNumber: (
  expected: unknown,
  matcherName: string,
  options?: MatcherHintOptions,
) => void;

export declare const ensureNoExpected: (
  expected: unknown,
  matcherName: string,
  options?: MatcherHintOptions,
) => void;

/**
 * Ensures that `actual` & `expected` are of type `number | bigint`
 */
export declare const ensureNumbers: (
  actual: unknown,
  expected: unknown,
  matcherName: string,
  options?: MatcherHintOptions,
) => void;

export declare const EXPECTED_COLOR: chalk.Chalk;

export declare const getLabelPrinter: (...strings: Array<string>) => PrintLabel;

export declare const highlightTrailingWhitespace: (text: string) => string;

export declare const INVERTED_COLOR: chalk.Chalk;

export declare const matcherErrorMessage: (
  hint: string,
  generic: string,
  specific?: string,
) => string;

export declare const matcherHint: (
  matcherName: string,
  received?: string,
  expected?: string,
  options?: MatcherHintOptions,
) => string;

declare type MatcherHintColor = (arg: string) => string;

export declare type MatcherHintOptions = {
  comment?: string;
  expectedColor?: MatcherHintColor;
  isDirectExpectCall?: boolean;
  isNot?: boolean;
  promise?: string;
  receivedColor?: MatcherHintColor;
  secondArgument?: string;
  secondArgumentColor?: MatcherHintColor;
};

export declare const pluralize: (word: string, count: number) => string;

export declare const printDiffOrStringify: (
  expected: unknown,
  received: unknown,
  expectedLabel: string,
  receivedLabel: string,
  expand: boolean,
) => string;

export declare const printExpected: (value: unknown) => string;

declare type PrintLabel = (string: string) => string;

export declare const printReceived: (object: unknown) => string;

export declare function printWithType<T>(
  name: string,
  value: T,
  print: (value: T) => string,
): string;

export declare const RECEIVED_COLOR: chalk.Chalk;

export declare function replaceMatchedToAsymmetricMatcher(
  replacedExpected: unknown,
  replacedReceived: unknown,
  expectedCycles: Array<unknown>,
  receivedCycles: Array<unknown>,
): {
  replacedExpected: unknown;
  replacedReceived: unknown;
};

export declare const stringify: (
  object: unknown,
  maxDepth?: number,
  maxWidth?: number,
) => string;

export declare const SUGGEST_TO_CONTAIN_EQUAL: string;

export {};
