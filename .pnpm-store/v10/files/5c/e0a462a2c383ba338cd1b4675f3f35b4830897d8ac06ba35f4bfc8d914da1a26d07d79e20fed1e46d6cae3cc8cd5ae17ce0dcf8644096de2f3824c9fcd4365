import type { TransformedSource, TransformOptions } from '@jest/transform';
import type { Config } from '@jest/types';
import type * as _babel from 'babel__core';
import type * as _ts from 'typescript';
import type { ConfigSet } from './legacy/config/config-set';
import type { RawCompilerOptions } from './raw-compiler-options';
declare module '@jest/types' {
    namespace Config {
        interface ConfigGlobals {
            /**
             * strangely `@ts-expect-error` doesn't work in this case when running
             * `npm run build` vs `npm run pretest`
             */
            'ts-jest'?: TsJestGlobalOptions;
        }
    }
}
export type TTypeScript = typeof _ts;
/**
 * Don't mark as internal because it is used in TsJestGlobalOptions which is an exposed type
 */
export type BabelConfig = _babel.TransformOptions;
export interface AstTransformer<T = Record<string, unknown>> {
    path: string;
    options?: T;
}
export interface ConfigCustomTransformer {
    before?: Array<string | AstTransformer>;
    after?: Array<string | AstTransformer>;
    afterDeclarations?: Array<string | AstTransformer>;
}
/**
 * @deprecated use `TsJestTransformerOptions` instead
 */
export interface TsJestGlobalOptions {
    /**
     * Compiler options. It can be:
     * - `true` (or `undefined`, it's the default): use default tsconfig file
     * - `false`: do NOT use default config file
     * - `path/to/tsconfig.json`: path to a specific tsconfig file (<rootDir> can be used)
     * - `{...}`: an object with inline compiler options
     *
     * @default undefined uses the default tsconfig file
     */
    tsconfig?: boolean | string | RawCompilerOptions;
    /**
     * Compiles files as isolated modules (disables some features and type-checking)
     *
     * @default undefined (disabled)
     */
    isolatedModules?: boolean;
    /**
     * Compiler to use
     *
     * @default 'typescript'
     */
    compiler?: 'typescript' | 'ttypescript' | string;
    /**
     * Custom transformers (mostly used by jest presets)
     */
    astTransformers?: ConfigCustomTransformer;
    /**
     * TS diagnostics - less to be reported if `isolatedModules` is `true`. It can be:
     * - `true` (or `undefined`, it's the default): show all diagnostics
     * - `false`: hide diagnostics of all files (kind of useless)
     * - `{...}`: an inline object with fine grained settings
     *
     * @default undefined shows all diagnostics
     */
    diagnostics?: boolean | {
        /**
         * Enables colorful and pretty output of errors
         *
         * @default undefined (enabled)
         */
        pretty?: boolean;
        /**
         * List of TypeScript diagnostic error codes to ignore
         * [here](https://github.com/Microsoft/TypeScript/blob/master/src/compiler/diagnosticMessages.json).
         *
         * @see https://github.com/Microsoft/TypeScript/blob/master/src/compiler/diagnosticMessages.json
         * @default [6059,18002,18003]
         */
        ignoreCodes?: number | string | Array<number | string>;
        /**
         * If specified, diagnostics of source files which path **matches** will be ignored
         */
        exclude?: string[];
        /**
         * Logs TypeScript errors to stderr instead of throwing exceptions
         *
         * @default undefined (disabled)
         */
        warnOnly?: boolean;
    };
    /**
     * Babel config. It can be:
     * - `false` (or `undefined`, it's the default): do NOT use babel
     * - `true`: use babel using default babelrc file
     * - `path/to/.babelrc`: path to a babelrc file (<rootDir> can be used)
     * - `{...}`: an object with inline babel options
     *
     * @default undefined does NOT use babel
     */
    babelConfig?: boolean | string | BabelConfig;
    /**
     * Kept for backward compatibility to handle __TRANSFORM_HTML__
     * Any file which will match this regex will be transpiled as a module
     * exporting the content of the file as a string
     */
    stringifyContentPathRegex?: string | RegExp;
    /**
     * Tell `ts-jest` to transform codes to ESM format. This only works in combination with `jest-runtime` ESM option
     * `supportsStaticESM` true which is passed into Jest transformer
     */
    useESM?: boolean;
}
/**
 * For transformers which extends `ts-jest`
 * @deprecated use `JestConfigWithTsJest` instead
 */
export interface ProjectConfigTsJest extends Config.ProjectConfig {
    globals: GlobalConfigTsJest;
}
/**
 * @deprecated use `JestConfigWithTsJest` instead
 */
export interface TransformOptionsTsJest extends TransformOptions {
    config: ProjectConfigTsJest;
}
/**
 * For typings in `jest.config.ts`
 * @deprecated use `JestConfigWithTsJest` instead
 */
export interface GlobalConfigTsJest extends Config.ConfigGlobals {
    'ts-jest'?: TsJestGlobalOptions;
}
/**
 * @deprecated use `JestConfigWithTsJest` instead
 */
export interface InitialOptionsTsJest extends Config.InitialOptions {
    globals?: GlobalConfigTsJest;
}
export type TsJestTransformerOptions = TsJestGlobalOptions;
export interface JestConfigWithTsJest extends Omit<Config.InitialOptions, 'transform'> {
    transform?: {
        [regex: string]: 'ts-jest' | 'ts-jest/legacy' | ['ts-jest', TsJestTransformerOptions] | ['ts-jest/legacy', TsJestTransformerOptions] | string | Config.TransformerConfig;
    };
}
export type TsJestPresets = Pick<JestConfigWithTsJest, 'extensionsToTreatAsEsm' | 'moduleFileExtensions' | 'transform' | 'testMatch'>;
export type StringMap = Map<string, string>;
export interface DepGraphInfo {
    fileContent: string;
    resolvedModuleNames: string[];
}
export interface TsJestCompileOptions {
    depGraphs: Map<string, DepGraphInfo>;
    watchMode: boolean;
    supportsStaticESM: boolean;
}
export interface CompiledOutput extends TransformedSource {
    diagnostics?: _ts.Diagnostic[];
}
export interface CompilerInstance {
    getResolvedModules(fileContent: string, fileName: string, runtimeCacheFS: StringMap): string[];
    getCompiledOutput(fileContent: string, fileName: string, options: TsJestCompileOptions): CompiledOutput;
}
export interface TsCompilerInstance extends CompilerInstance {
    configSet: ConfigSet;
    program: _ts.Program | undefined;
}
export interface AstTransformerDesc<T = Record<string, unknown>> {
    name: string;
    version: number;
    factory(tsCompiler: TsCompilerInstance, opts?: T): _ts.TransformerFactory<_ts.SourceFile> | _ts.TransformerFactory<_ts.Bundle | _ts.SourceFile>;
    options?: T;
}
export interface TsJestAstTransformer {
    before: AstTransformerDesc[];
    after: AstTransformerDesc[];
    afterDeclarations: AstTransformerDesc[];
}
