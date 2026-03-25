/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type {default as default_2} from 'jest-resolve';
import type {IHasteFS} from 'jest-haste-map';
import type {ResolveModuleConfig} from 'jest-resolve';
import {SnapshotResolver} from 'jest-snapshot';

/**
 * DependencyResolver is used to resolve the direct dependencies of a module or
 * to retrieve a list of all transitive inverse dependencies.
 */
export declare class DependencyResolver {
  private readonly _hasteFS;
  private readonly _resolver;
  private readonly _snapshotResolver;
  constructor(
    resolver: default_2,
    hasteFS: IHasteFS,
    snapshotResolver: SnapshotResolver,
  );
  resolve(file: string, options?: ResolveModuleConfig): Array<string>;
  resolveInverseModuleMap(
    paths: Set<string>,
    filter: (file: string) => boolean,
    options?: ResolveModuleConfig,
  ): Array<ResolvedModule>;
  resolveInverse(
    paths: Set<string>,
    filter: (file: string) => boolean,
    options?: ResolveModuleConfig,
  ): Array<string>;
}

export declare type ResolvedModule = {
  file: string;
  dependencies: Array<string>;
};

export {};
