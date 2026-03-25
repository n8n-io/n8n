/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
/// <reference types="node" />

import type {Config} from '@jest/types';
import type {Stats} from 'graceful-fs';

declare type ChangeEvent = {
  eventsQueue: EventsQueue;
  hasteFS: HasteFS;
  moduleMap: ModuleMap_2;
};

export declare class DuplicateError extends Error {
  mockPath1: string;
  mockPath2: string;
  constructor(mockPath1: string, mockPath2: string);
}

declare class DuplicateHasteCandidatesError extends Error {
  hasteName: string;
  platform: string | null;
  supportsNativePlatform: boolean;
  duplicatesSet: DuplicatesSet;
  constructor(
    name: string,
    platform: string,
    supportsNativePlatform: boolean,
    duplicatesSet: DuplicatesSet,
  );
}

declare type DuplicatesIndex = Map<string, Map<string, DuplicatesSet>>;

declare type DuplicatesSet = Map<string, /* type */ number>;

declare type EventsQueue = Array<{
  filePath: string;
  stat: Stats | undefined;
  type: string;
}>;

declare type FileData = Map<string, FileMetaData>;

declare type FileMetaData = [
  id: string,
  mtime: number,
  size: number,
  visited: 0 | 1,
  dependencies: string,
  sha1: string | null | undefined,
];

declare class HasteFS implements IHasteFS {
  private readonly _rootDir;
  private readonly _files;
  constructor({rootDir, files}: {rootDir: string; files: FileData});
  getModuleName(file: string): string | null;
  getSize(file: string): number | null;
  getDependencies(file: string): Array<string> | null;
  getSha1(file: string): string | null;
  exists(file: string): boolean;
  getAllFiles(): Array<string>;
  getFileIterator(): Iterable<string>;
  getAbsoluteFileIterator(): Iterable<string>;
  matchFiles(pattern: RegExp | string): Array<string>;
  matchFilesWithGlob(globs: Array<string>, root: string | null): Set<string>;
  private _getFileData;
}

declare type HasteMapStatic<S = SerializableModuleMap> = {
  getCacheFilePath(
    tmpdir: string,
    name: string,
    ...extra: Array<string>
  ): string;
  getModuleMapFromJSON(json: S): IModuleMap<S>;
};

declare type HasteRegExp = RegExp | ((str: string) => boolean);

declare type HType = {
  ID: 0;
  MTIME: 1;
  SIZE: 2;
  VISITED: 3;
  DEPENDENCIES: 4;
  SHA1: 5;
  PATH: 0;
  TYPE: 1;
  MODULE: 0;
  PACKAGE: 1;
  GENERIC_PLATFORM: 'g';
  NATIVE_PLATFORM: 'native';
  DEPENDENCY_DELIM: '\0';
};

declare type HTypeValue = HType[keyof HType];

export declare interface IHasteFS {
  exists(path: string): boolean;
  getAbsoluteFileIterator(): Iterable<string>;
  getAllFiles(): Array<string>;
  getDependencies(file: string): Array<string> | null;
  getSize(path: string): number | null;
  matchFiles(pattern: RegExp | string): Array<string>;
  matchFilesWithGlob(
    globs: ReadonlyArray<string>,
    root: string | null,
  ): Set<string>;
}

export declare interface IHasteMap {
  on(eventType: 'change', handler: (event: ChangeEvent) => void): void;
  build(): Promise<{
    hasteFS: IHasteFS;
    moduleMap: IModuleMap;
  }>;
}

declare type IJestHasteMap = HasteMapStatic & {
  create(options: Options): Promise<IHasteMap>;
  getStatic(config: Config.ProjectConfig): HasteMapStatic;
};

export declare interface IModuleMap<S = SerializableModuleMap> {
  getModule(
    name: string,
    platform?: string | null,
    supportsNativePlatform?: boolean | null,
    type?: HTypeValue | null,
  ): string | null;
  getPackage(
    name: string,
    platform: string | null | undefined,
    _supportsNativePlatform: boolean | null,
  ): string | null;
  getMockModule(name: string): string | undefined;
  getRawModuleMap(): RawModuleMap;
  toJSON(): S;
}

declare const JestHasteMap: IJestHasteMap;
export default JestHasteMap;

declare type MockData = Map<string, string>;

export declare const ModuleMap: {
  create: (rootPath: string) => IModuleMap;
};

declare class ModuleMap_2 implements IModuleMap {
  static DuplicateHasteCandidatesError: typeof DuplicateHasteCandidatesError;
  private readonly _raw;
  private json;
  private static mapToArrayRecursive;
  private static mapFromArrayRecursive;
  constructor(raw: RawModuleMap);
  getModule(
    name: string,
    platform?: string | null,
    supportsNativePlatform?: boolean | null,
    type?: HTypeValue | null,
  ): string | null;
  getPackage(
    name: string,
    platform: string | null | undefined,
    _supportsNativePlatform: boolean | null,
  ): string | null;
  getMockModule(name: string): string | undefined;
  getRawModuleMap(): RawModuleMap;
  toJSON(): SerializableModuleMap;
  static fromJSON(serializableModuleMap: SerializableModuleMap): ModuleMap_2;
  /**
   * When looking up a module's data, we walk through each eligible platform for
   * the query. For each platform, we want to check if there are known
   * duplicates for that name+platform pair. The duplication logic normally
   * removes elements from the `map` object, but we want to check upfront to be
   * extra sure. If metadata exists both in the `duplicates` object and the
   * `map`, this would be a bug.
   */
  private _getModuleMetadata;
  private _assertNoDuplicates;
  static create(rootDir: string): ModuleMap_2;
}

declare type ModuleMapData = Map<string, ModuleMapItem>;

declare type ModuleMapItem = {
  [platform: string]: ModuleMetaData;
};

declare type ModuleMetaData = [path: string, type: number];

declare type Options = {
  cacheDirectory?: string;
  computeDependencies?: boolean;
  computeSha1?: boolean;
  console?: Console;
  dependencyExtractor?: string | null;
  enableSymlinks?: boolean;
  extensions: Array<string>;
  forceNodeFilesystemAPI?: boolean;
  hasteImplModulePath?: string;
  hasteMapModulePath?: string;
  id: string;
  ignorePattern?: HasteRegExp;
  maxWorkers: number;
  mocksPattern?: string;
  platforms: Array<string>;
  resetCache?: boolean;
  retainAllFiles: boolean;
  rootDir: string;
  roots: Array<string>;
  skipPackageJson?: boolean;
  throwOnModuleCollision?: boolean;
  useWatchman?: boolean;
  watch?: boolean;
  workerThreads?: boolean;
};

declare type RawModuleMap = {
  rootDir: string;
  duplicates: DuplicatesIndex;
  map: ModuleMapData;
  mocks: MockData;
};

export declare type SerializableModuleMap = {
  duplicates: ReadonlyArray<[string, [string, [string, [string, number]]]]>;
  map: ReadonlyArray<[string, ValueType<ModuleMapData>]>;
  mocks: ReadonlyArray<[string, ValueType<MockData>]>;
  rootDir: string;
};

declare type ValueType<T> = T extends Map<string, infer V> ? V : never;

export {};
