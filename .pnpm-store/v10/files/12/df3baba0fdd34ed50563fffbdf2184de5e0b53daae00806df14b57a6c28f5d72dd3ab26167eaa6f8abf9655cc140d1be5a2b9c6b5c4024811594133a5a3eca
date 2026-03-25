/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export declare type ChangedFiles = {
  repos: Repos;
  changedFiles: Paths;
};

export declare type ChangedFilesPromise = Promise<ChangedFiles>;

export declare const findRepos: (roots: Array<string>) => Promise<Repos>;

export declare const getChangedFilesForRoots: (
  roots: Array<string>,
  options: Options,
) => ChangedFilesPromise;

declare type Options = {
  lastCommit?: boolean;
  withAncestor?: boolean;
  changedSince?: string;
  includePaths?: Array<string>;
};

declare type Paths = Set<string>;

declare type Repos = {
  git: Paths;
  hg: Paths;
  sl: Paths;
};

export {};
