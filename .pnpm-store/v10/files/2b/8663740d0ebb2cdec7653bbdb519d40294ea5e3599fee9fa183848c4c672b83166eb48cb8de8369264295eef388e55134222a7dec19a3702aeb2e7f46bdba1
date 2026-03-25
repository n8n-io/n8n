/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type {IModuleMap} from 'jest-haste-map';

export declare type AsyncResolver = (
  path: string,
  options: ResolverOptions,
) => Promise<string>;

declare function cachedShouldLoadAsEsm(
  path: string,
  extensionsToTreatAsEsm: Array<string>,
): boolean;

declare const defaultResolver: SyncResolver;

export declare type FindNodeModuleConfig = {
  basedir: string;
  conditions?: Array<string>;
  extensions?: Array<string>;
  moduleDirectory?: Array<string>;
  paths?: Array<string>;
  resolver?: string | null;
  rootDir?: string;
  throwIfNotFound?: boolean;
};

export declare type JestResolver = ResolverSyncObject | ResolverAsyncObject;

declare interface JSONObject {
  [key: string]: JSONValue;
}

declare type JSONValue =
  | string
  | number
  | boolean
  | JSONObject
  | Array<JSONValue>;

declare type ModuleNameMapperConfig = {
  regex: RegExp;
  moduleName: string | Array<string>;
};

declare class ModuleNotFoundError extends Error {
  code: string;
  hint?: string;
  requireStack?: Array<string>;
  siblingWithSimilarExtensionFound?: boolean;
  moduleName?: string;
  private _originalMessage?;
  constructor(message: string, moduleName?: string);
  buildMessage(rootDir: string): void;
  static duckType(error: ModuleNotFoundError): ModuleNotFoundError;
}

/**
 * Allows transforming parsed `package.json` contents.
 *
 * @param pkg - Parsed `package.json` contents.
 * @param file - Path to `package.json` file.
 * @param dir - Directory that contains the `package.json`.
 *
 * @returns Transformed `package.json` contents.
 */
export declare type PackageFilter = (
  pkg: PackageJSON,
  file: string,
  dir: string,
) => PackageJSON;

export declare type PackageJSON = JSONObject;

/**
 * Allows transforming a path within a package.
 *
 * @param pkg - Parsed `package.json` contents.
 * @param path - Path being resolved.
 * @param relativePath - Path relative from the `package.json` location.
 *
 * @returns Relative path that will be joined from the `package.json` location.
 */
export declare type PathFilter = (
  pkg: PackageJSON,
  path: string,
  relativePath: string,
) => string;

export declare type ResolveModuleConfig = {
  conditions?: Array<string>;
  skipNodeResolution?: boolean;
  paths?: Array<string>;
};

declare class Resolver {
  private readonly _options;
  private readonly _moduleMap;
  private readonly _moduleIDCache;
  private readonly _moduleNameCache;
  private readonly _modulePathCache;
  private readonly _supportsNativePlatform;
  constructor(moduleMap: IModuleMap, options: ResolverConfig);
  static ModuleNotFoundError: typeof ModuleNotFoundError;
  static tryCastModuleNotFoundError(error: unknown): ModuleNotFoundError | null;
  static clearDefaultResolverCache(): void;
  static findNodeModule(
    path: string,
    options: FindNodeModuleConfig,
  ): string | null;
  static findNodeModuleAsync(
    path: string,
    options: FindNodeModuleConfig,
  ): Promise<string | null>;
  static unstable_shouldLoadAsEsm: typeof cachedShouldLoadAsEsm;
  resolveModuleFromDirIfExists(
    dirname: string,
    moduleName: string,
    options?: ResolveModuleConfig,
  ): string | null;
  resolveModuleFromDirIfExistsAsync(
    dirname: string,
    moduleName: string,
    options?: ResolveModuleConfig,
  ): Promise<string | null>;
  resolveModule(
    from: string,
    moduleName: string,
    options?: ResolveModuleConfig,
  ): string;
  resolveModuleAsync(
    from: string,
    moduleName: string,
    options?: ResolveModuleConfig,
  ): Promise<string>;
  /**
   * _prepareForResolution is shared between the sync and async module resolution
   * methods, to try to keep them as DRY as possible.
   */
  private _prepareForResolution;
  /**
   * _getHasteModulePath attempts to return the path to a haste module.
   */
  private _getHasteModulePath;
  private _throwModNotFoundError;
  private _getMapModuleName;
  private _isAliasModule;
  isCoreModule(moduleName: string): boolean;
  getModule(name: string): string | null;
  getModulePath(from: string, moduleName: string): string;
  getPackage(name: string): string | null;
  getMockModule(from: string, name: string): string | null;
  getMockModuleAsync(from: string, name: string): Promise<string | null>;
  getModulePaths(from: string): Array<string>;
  getGlobalPaths(moduleName?: string): Array<string>;
  getModuleID(
    virtualMocks: Map<string, boolean>,
    from: string,
    moduleName?: string,
    options?: ResolveModuleConfig,
  ): string;
  getModuleIDAsync(
    virtualMocks: Map<string, boolean>,
    from: string,
    moduleName?: string,
    options?: ResolveModuleConfig,
  ): Promise<string>;
  private _getModuleType;
  private _getAbsolutePath;
  private _getAbsolutePathAsync;
  private _getMockPath;
  private _getMockPathAsync;
  private _getVirtualMockPath;
  private _getVirtualMockPathAsync;
  private _isModuleResolved;
  private _isModuleResolvedAsync;
  resolveStubModuleName(from: string, moduleName: string): string | null;
  resolveStubModuleNameAsync(
    from: string,
    moduleName: string,
  ): Promise<string | null>;
}
export default Resolver;

declare type ResolverAsyncObject = {
  sync?: SyncResolver;
  async: AsyncResolver;
};

declare type ResolverConfig = {
  defaultPlatform?: string | null;
  extensions: Array<string>;
  hasCoreModules: boolean;
  moduleDirectories: Array<string>;
  moduleNameMapper?: Array<ModuleNameMapperConfig> | null;
  modulePaths?: Array<string>;
  platforms?: Array<string>;
  resolver?: string | null;
  rootDir: string;
};

export declare type ResolverOptions = {
  /** Directory to begin resolving from. */
  basedir: string;
  /** List of export conditions. */
  conditions?: Array<string>;
  /** Instance of default resolver. */
  defaultResolver: typeof defaultResolver;
  /** List of file extensions to search in order. */
  extensions?: Array<string>;
  /**
   * List of directory names to be looked up for modules recursively.
   *
   * @defaultValue
   * The default is `['node_modules']`.
   */
  moduleDirectory?: Array<string>;
  /**
   * List of `require.paths` to use if nothing is found in `node_modules`.
   *
   * @defaultValue
   * The default is `undefined`.
   */
  paths?: Array<string>;
  /** Allows transforming parsed `package.json` contents. */
  packageFilter?: PackageFilter;
  /** Allows transforms a path within a package. */
  pathFilter?: PathFilter;
  /** Current root directory. */
  rootDir?: string;
};

declare type ResolverSyncObject = {
  sync: SyncResolver;
  async?: AsyncResolver;
};

/**
 * Finds the runner to use:
 *
 * 1. looks for jest-runner-<name> relative to project.
 * 1. looks for jest-runner-<name> relative to Jest.
 * 1. looks for <name> relative to project.
 * 1. looks for <name> relative to Jest.
 */
export declare const resolveRunner: (
  resolver: string | undefined | null,
  {
    filePath,
    rootDir,
    requireResolveFunction,
  }: {
    filePath: string;
    rootDir: string;
    requireResolveFunction: (moduleName: string) => string;
  },
) => string;

export declare const resolveSequencer: (
  resolver: string | undefined | null,
  {
    filePath,
    rootDir,
    requireResolveFunction,
  }: {
    filePath: string;
    rootDir: string;
    requireResolveFunction: (moduleName: string) => string;
  },
) => string;

/**
 * Finds the test environment to use:
 *
 * 1. looks for jest-environment-<name> relative to project.
 * 1. looks for jest-environment-<name> relative to Jest.
 * 1. looks for <name> relative to project.
 * 1. looks for <name> relative to Jest.
 */
export declare const resolveTestEnvironment: ({
  rootDir,
  testEnvironment: filePath,
  requireResolveFunction,
}: {
  rootDir: string;
  testEnvironment: string;
  requireResolveFunction: (moduleName: string) => string;
}) => string;

/**
 * Finds the watch plugins to use:
 *
 * 1. looks for jest-watch-<name> relative to project.
 * 1. looks for jest-watch-<name> relative to Jest.
 * 1. looks for <name> relative to project.
 * 1. looks for <name> relative to Jest.
 */
export declare const resolveWatchPlugin: (
  resolver: string | undefined | null,
  {
    filePath,
    rootDir,
    requireResolveFunction,
  }: {
    filePath: string;
    rootDir: string;
    requireResolveFunction: (moduleName: string) => string;
  },
) => string;

export declare type SyncResolver = (
  path: string,
  options: ResolverOptions,
) => string;

export {};
