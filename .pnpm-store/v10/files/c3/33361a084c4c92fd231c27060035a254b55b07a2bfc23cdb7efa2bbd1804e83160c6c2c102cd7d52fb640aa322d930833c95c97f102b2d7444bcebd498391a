/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export declare type Callbacks = {
  foundSubsequence: FoundSubsequence;
  isCommon: IsCommon;
};

declare function diffSequence(
  aLength: number,
  bLength: number,
  isCommon: IsCommon,
  foundSubsequence: FoundSubsequence,
): void;
export default diffSequence;

declare type FoundSubsequence = (
  nCommon: number, // caller can assume: 0 < nCommon
  aCommon: number, // caller can assume: 0 <= aCommon && aCommon < aLength
  bCommon: number,
) => void;

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
declare type IsCommon = (
  aIndex: number, // caller can assume: 0 <= aIndex && aIndex < aLength
  bIndex: number,
) => boolean;

export {};
