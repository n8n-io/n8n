/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import type {Config} from '@jest/types';
import type {EncodedSourceMap} from '@jridgewell/trace-mapping';
import type {TransformTypes} from '@jest/types';

export declare interface AsyncTransformer<TransformerConfig = unknown> {
  /**
   * Indicates if the transformer is capable of instrumenting the code for code coverage.
   *
   * If V8 coverage is _not_ active, and this is `true`, Jest will assume the code is instrumented.
   * If V8 coverage is _not_ active, and this is `false`. Jest will instrument the code returned by this transformer using Babel.
   */
  canInstrument?: boolean;
  getCacheKey?: (
    sourceText: string,
    sourcePath: string,
    options: TransformOptions<TransformerConfig>,
  ) => string;
  getCacheKeyAsync?: (
    sourceText: string,
    sourcePath: string,
    options: TransformOptions<TransformerConfig>,
  ) => Promise<string>;
  process?: (
    sourceText: string,
    sourcePath: string,
    options: TransformOptions<TransformerConfig>,
  ) => TransformedSource;
  processAsync: (
    sourceText: string,
    sourcePath: string,
    options: TransformOptions<TransformerConfig>,
  ) => Promise<TransformedSource>;
}

export declare interface CallerTransformOptions {
  supportsDynamicImport: boolean;
  supportsExportNamespaceFrom: boolean;
  supportsStaticESM: boolean;
  supportsTopLevelAwait: boolean;
}

export declare function createScriptTransformer(
  config: Config.ProjectConfig,
  cacheFS?: StringMap,
): Promise<ScriptTransformer>;

export declare function createTranspilingRequire(
  config: Config.ProjectConfig,
): Promise<
  <TModuleType = unknown>(
    resolverPath: string,
    applyInteropRequireDefault?: boolean,
  ) => Promise<TModuleType>
>;

declare interface ErrorWithCodeFrame extends Error {
  codeFrame?: string;
}

declare interface FixedRawSourceMap extends Omit<EncodedSourceMap, 'version'> {
  version: number;
}

export declare function handlePotentialSyntaxError(
  e: ErrorWithCodeFrame,
): ErrorWithCodeFrame;

declare interface ReducedTransformOptions extends CallerTransformOptions {
  instrument: boolean;
}

declare interface RequireAndTranspileModuleOptions
  extends ReducedTransformOptions {
  applyInteropRequireDefault: boolean;
}

export declare type ScriptTransformer = ScriptTransformer_2;

declare class ScriptTransformer_2 {
  private readonly _config;
  private readonly _cacheFS;
  private readonly _cache;
  private readonly _transformCache;
  private _transformsAreLoaded;
  constructor(_config: Config.ProjectConfig, _cacheFS: StringMap);
  private _buildCacheKeyFromFileInfo;
  private _buildTransformCacheKey;
  private _getCacheKey;
  private _getCacheKeyAsync;
  private _createCachedFilename;
  private _getFileCachePath;
  private _getFileCachePathAsync;
  private _getTransformPatternAndPath;
  private _getTransformPath;
  loadTransformers(): Promise<void>;
  private _getTransformer;
  private _instrumentFile;
  private _buildTransformResult;
  transformSource(
    filepath: string,
    content: string,
    options: ReducedTransformOptions,
  ): TransformResult;
  transformSourceAsync(
    filepath: string,
    content: string,
    options: ReducedTransformOptions,
  ): Promise<TransformResult>;
  private _transformAndBuildScriptAsync;
  private _transformAndBuildScript;
  transformAsync(
    filename: string,
    options: TransformationOptions,
    fileSource?: string,
  ): Promise<TransformResult>;
  transform(
    filename: string,
    options: TransformationOptions,
    fileSource?: string,
  ): TransformResult;
  transformJson(
    filename: string,
    options: TransformationOptions,
    fileSource: string,
  ): string;
  requireAndTranspileModule<ModuleType = unknown>(
    moduleName: string,
    callback?: (module: ModuleType) => void | Promise<void>,
    options?: RequireAndTranspileModuleOptions,
  ): Promise<ModuleType>;
  shouldTransform(filename: string): boolean;
}

export declare function shouldInstrument(
  filename: string,
  options: ShouldInstrumentOptions,
  config: Config.ProjectConfig,
  loadedFilenames?: Array<string>,
): boolean;

export declare interface ShouldInstrumentOptions
  extends Pick<
    Config.GlobalConfig,
    'collectCoverage' | 'collectCoverageFrom' | 'coverageProvider'
  > {
  changedFiles?: Set<string>;
  sourcesRelatedToTestsInChangedFiles?: Set<string>;
}

declare type StringMap = Map<string, string>;

export declare interface SyncTransformer<TransformerConfig = unknown> {
  /**
   * Indicates if the transformer is capable of instrumenting the code for code coverage.
   *
   * If V8 coverage is _not_ active, and this is `true`, Jest will assume the code is instrumented.
   * If V8 coverage is _not_ active, and this is `false`. Jest will instrument the code returned by this transformer using Babel.
   */
  canInstrument?: boolean;
  getCacheKey?: (
    sourceText: string,
    sourcePath: string,
    options: TransformOptions<TransformerConfig>,
  ) => string;
  getCacheKeyAsync?: (
    sourceText: string,
    sourcePath: string,
    options: TransformOptions<TransformerConfig>,
  ) => Promise<string>;
  process: (
    sourceText: string,
    sourcePath: string,
    options: TransformOptions<TransformerConfig>,
  ) => TransformedSource;
  processAsync?: (
    sourceText: string,
    sourcePath: string,
    options: TransformOptions<TransformerConfig>,
  ) => Promise<TransformedSource>;
}

export declare interface TransformationOptions
  extends ShouldInstrumentOptions,
    CallerTransformOptions {
  isInternalModule?: boolean;
}

export declare type TransformedSource = {
  code: string;
  map?: FixedRawSourceMap | string | null;
};

/**
 * We have both sync (`process`) and async (`processAsync`) code transformation, which both can be provided.
 * `require` will always use `process`, and `import` will use `processAsync` if it exists, otherwise fall back to `process`.
 * Meaning, if you use `import` exclusively you do not need `process`, but in most cases supplying both makes sense:
 * Jest transpiles on demand rather than ahead of time, so the sync one needs to exist.
 *
 * For more info on the sync vs async model, see https://jestjs.io/docs/code-transformation#writing-custom-transformers
 */
declare type Transformer_2<TransformerConfig = unknown> =
  | SyncTransformer<TransformerConfig>
  | AsyncTransformer<TransformerConfig>;
export {Transformer_2 as Transformer};

export declare type TransformerCreator<
  X extends Transformer_2<TransformerConfig>,
  TransformerConfig = unknown,
> = (transformerConfig?: TransformerConfig) => X | Promise<X>;

/**
 * Instead of having your custom transformer implement the Transformer interface
 * directly, you can choose to export a factory function to dynamically create
 * transformers. This is to allow having a transformer config in your jest config.
 */
export declare type TransformerFactory<X extends Transformer_2> = {
  createTransformer: TransformerCreator<X>;
};

export declare interface TransformOptions<TransformerConfig = unknown>
  extends ReducedTransformOptions {
  /** Cached file system which is used by `jest-runtime` to improve performance. */
  cacheFS: StringMap;
  /** Jest configuration of currently running project. */
  config: Config.ProjectConfig;
  /** Stringified version of the `config` - useful in cache busting. */
  configString: string;
  /** Transformer configuration passed through `transform` option by the user. */
  transformerConfig: TransformerConfig;
}

export declare type TransformResult = TransformTypes.TransformResult;

export {};
