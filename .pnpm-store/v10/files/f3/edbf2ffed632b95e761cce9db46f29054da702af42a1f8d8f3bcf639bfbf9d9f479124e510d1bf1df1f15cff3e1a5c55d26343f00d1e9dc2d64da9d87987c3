/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/// <reference lib="es2021.weakref" />

/// <reference lib="es2021.weakref" />
declare class LeakDetector {
  private _isReferenceBeingHeld;
  private readonly _finalizationRegistry?;
  constructor(value: unknown);
  isLeaking(): Promise<boolean>;
  private _runGarbageCollector;
}
export default LeakDetector;

export {};
