/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type {CompareKeys} from 'pretty-format';

/**
 * Class representing one diff tuple.
 * Attempts to look like a two-element array (which is what this used to be).
 * @param {number} op Operation, one of: DIFF_DELETE, DIFF_INSERT, DIFF_EQUAL.
 * @param {string} text Text to be deleted, inserted, or retained.
 * @constructor
 */
export declare class Diff {
  0: number;
  1: string;
  constructor(op: number, text: string);
}

export declare function diff(
  a: any,
  b: any,
  options?: DiffOptions,
): string | null;

/**
 * The data structure representing a diff is an array of tuples:
 * [[DIFF_DELETE, 'Hello'], [DIFF_INSERT, 'Goodbye'], [DIFF_EQUAL, ' world.']]
 * which means: delete 'Hello', add 'Goodbye' and keep ' world.'
 */
export declare var DIFF_DELETE: number;

export declare var DIFF_EQUAL: number;

export declare var DIFF_INSERT: number;

export declare const diffLinesRaw: (
  aLines: Array<string>,
  bLines: Array<string>,
) => Array<Diff>;

export declare const diffLinesUnified: (
  aLines: Array<string>,
  bLines: Array<string>,
  options?: DiffOptions,
) => string;

export declare const diffLinesUnified2: (
  aLinesDisplay: Array<string>,
  bLinesDisplay: Array<string>,
  aLinesCompare: Array<string>,
  bLinesCompare: Array<string>,
  options?: DiffOptions,
) => string;

export declare type DiffOptions = {
  aAnnotation?: string;
  aColor?: DiffOptionsColor;
  aIndicator?: string;
  bAnnotation?: string;
  bColor?: DiffOptionsColor;
  bIndicator?: string;
  changeColor?: DiffOptionsColor;
  changeLineTrailingSpaceColor?: DiffOptionsColor;
  commonColor?: DiffOptionsColor;
  commonIndicator?: string;
  commonLineTrailingSpaceColor?: DiffOptionsColor;
  contextLines?: number;
  emptyFirstOrLastLinePlaceholder?: string;
  expand?: boolean;
  includeChangeCounts?: boolean;
  omitAnnotationLines?: boolean;
  patchColor?: DiffOptionsColor;
  compareKeys?: CompareKeys;
};

export declare type DiffOptionsColor = (arg: string) => string;

export declare const diffStringsRaw: (
  a: string,
  b: string,
  cleanup: boolean,
) => Array<Diff>;

export declare const diffStringsUnified: (
  a: string,
  b: string,
  options?: DiffOptions,
) => string;

export {};
