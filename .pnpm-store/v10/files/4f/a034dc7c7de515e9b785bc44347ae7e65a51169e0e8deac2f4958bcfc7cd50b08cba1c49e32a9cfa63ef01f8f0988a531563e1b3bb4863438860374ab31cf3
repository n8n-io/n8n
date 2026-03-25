/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import {CallerTransformOptions} from '@jest/transform';
import type {Config} from '@jest/types';
import type {expect} from '@jest/globals';
import type {Global} from '@jest/types';
import {IHasteMap} from 'jest-haste-map';
import {IModuleMap} from 'jest-haste-map';
import type {JestEnvironment} from '@jest/environment';
import Resolver from 'jest-resolve';
import {ScriptTransformer} from '@jest/transform';
import {shouldInstrument} from '@jest/transform';
import {ShouldInstrumentOptions} from '@jest/transform';
import type {SourceMapRegistry} from '@jest/source-map';
import type {TestContext} from '@jest/test-result';
import type {V8CoverageResult} from '@jest/test-result';

declare type HasteMapOptions = {
  console?: Console;
  maxWorkers: number;
  resetCache: boolean;
  watch?: boolean;
  watchman: boolean;
  workerThreads?: boolean;
};

declare interface InternalModuleOptions
  extends Required<CallerTransformOptions> {
  isInternalModule: boolean;
}

declare interface JestGlobals extends Global.TestFrameworkGlobals {
  expect: typeof expect;
}

declare class Runtime {
  private readonly _cacheFS;
  private readonly _cacheFSBuffer;
  private readonly _config;
  private readonly _globalConfig?;
  private readonly _coverageOptions;
  private _currentlyExecutingModulePath;
  private readonly _environment;
  private readonly _explicitShouldMock;
  private readonly _explicitShouldMockModule;
  private _fakeTimersImplementation;
  private readonly _internalModuleRegistry;
  private _isCurrentlyExecutingManualMock;
  private _mainModule;
  private readonly _mockFactories;
  private readonly _mockMetaDataCache;
  private _mockRegistry;
  private _isolatedMockRegistry;
  private readonly _moduleMockRegistry;
  private readonly _moduleMockFactories;
  private readonly _moduleMocker;
  private _isolatedModuleRegistry;
  private _moduleRegistry;
  private readonly _esmoduleRegistry;
  private readonly _cjsNamedExports;
  private readonly _esmModuleLinkingMap;
  private readonly _testPath;
  private readonly _resolver;
  private _shouldAutoMock;
  private readonly _shouldMockModuleCache;
  private readonly _shouldUnmockTransitiveDependenciesCache;
  private readonly _sourceMapRegistry;
  private readonly _scriptTransformer;
  private readonly _fileTransforms;
  private readonly _fileTransformsMutex;
  private _v8CoverageInstrumenter;
  private _v8CoverageResult;
  private _v8CoverageSources;
  private readonly _transitiveShouldMock;
  private _unmockList;
  private readonly _virtualMocks;
  private readonly _virtualModuleMocks;
  private _moduleImplementation?;
  private readonly jestObjectCaches;
  private jestGlobals?;
  private readonly esmConditions;
  private readonly cjsConditions;
  private isTornDown;
  constructor(
    config: Config.ProjectConfig,
    environment: JestEnvironment,
    resolver: Resolver,
    transformer: ScriptTransformer,
    cacheFS: Map<string, string>,
    coverageOptions: ShouldInstrumentOptions,
    testPath: string,
    globalConfig?: Config.GlobalConfig,
  );
  static shouldInstrument: typeof shouldInstrument;
  static createContext(
    config: Config.ProjectConfig,
    options: {
      console?: Console;
      maxWorkers: number;
      watch?: boolean;
      watchman: boolean;
    },
  ): Promise<TestContext>;
  static createHasteMap(
    config: Config.ProjectConfig,
    options?: HasteMapOptions,
  ): Promise<IHasteMap>;
  static createResolver(
    config: Config.ProjectConfig,
    moduleMap: IModuleMap,
  ): Resolver;
  static runCLI(): Promise<never>;
  static getCLIOptions(): never;
  unstable_shouldLoadAsEsm(modulePath: string): boolean;
  private loadEsmModule;
  private resolveModule;
  private linkAndEvaluateModule;
  unstable_importModule(
    from: string,
    moduleName?: string,
  ): Promise<unknown | void>;
  private loadCjsAsEsm;
  private importMock;
  private getExportsOfCjs;
  requireModule<T = unknown>(
    from: string,
    moduleName?: string,
    options?: InternalModuleOptions,
    isRequireActual?: boolean,
  ): T;
  requireInternalModule<T = unknown>(from: string, to?: string): T;
  requireActual<T = unknown>(from: string, moduleName: string): T;
  requireMock<T = unknown>(from: string, moduleName: string): T;
  private _loadModule;
  private _getFullTransformationOptions;
  requireModuleOrMock<T = unknown>(from: string, moduleName: string): T;
  isolateModules(fn: () => void): void;
  isolateModulesAsync(fn: () => Promise<void>): Promise<void>;
  resetModules(): void;
  collectV8Coverage(): Promise<void>;
  stopCollectingV8Coverage(): Promise<void>;
  getAllCoverageInfoCopy(): JestEnvironment['global']['__coverage__'];
  getAllV8CoverageInfoCopy(): V8CoverageResult;
  getSourceMaps(): SourceMapRegistry;
  setMock(
    from: string,
    moduleName: string,
    mockFactory: () => unknown,
    options?: {
      virtual?: boolean;
    },
  ): void;
  private setModuleMock;
  restoreAllMocks(): void;
  resetAllMocks(): void;
  clearAllMocks(): void;
  teardown(): void;
  private _resolveCjsModule;
  private _resolveModule;
  private _requireResolve;
  private _requireResolvePaths;
  private _execModule;
  private transformFile;
  private transformFileAsync;
  private createScriptFromCode;
  private _requireCoreModule;
  private _importCoreModule;
  private _importWasmModule;
  private _getMockedNativeModule;
  private _generateMock;
  private _shouldMockCjs;
  private _shouldMockModule;
  private _createRequireImplementation;
  private _createJestObjectFor;
  private _logFormattedReferenceError;
  private wrapCodeInModuleWrapper;
  private constructModuleWrapperStart;
  private constructInjectedModuleParameters;
  private handleExecutionError;
  private getGlobalsForCjs;
  private getGlobalsForEsm;
  private getGlobalsFromEnvironment;
  private readFileBuffer;
  private readFile;
  setGlobalsForRuntime(globals: JestGlobals): void;
}
export default Runtime;

export {};
