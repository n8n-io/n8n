import { Logger } from 'bs-logger';
import type * as ts from 'typescript';
import type { TsConfigCompilerOptionsJson } from '../../config';
import type { RawCompilerOptions } from '../../raw-compiler-options';
import type { TsJestAstTransformer, TsJestTransformOptions, TTypeScript } from '../../types';
export declare class ConfigSet {
    readonly parentLogger?: Logger | undefined;
    /**
     * Use by e2e, don't mark as internal
     */
    readonly tsJestDigest: string;
    readonly logger: Logger;
    readonly compilerModule: TTypeScript;
    readonly isolatedModules: boolean;
    readonly cwd: string;
    readonly rootDir: string;
    cacheSuffix: string;
    tsCacheDir: string | undefined;
    parsedTsConfig: ts.ParsedCommandLine | Record<string, any>;
    resolvedTransformers: TsJestAstTransformer;
    useESM: boolean;
    constructor(jestConfig: TsJestTransformOptions['config'] | undefined, parentLogger?: Logger | undefined);
    /**
     * Load TypeScript configuration. Returns the parsed TypeScript config and any `tsconfig` options specified in ts-jest
     * Subclasses which extend `ConfigSet` can override the default behavior
     */
    protected _resolveTsConfig(compilerOptions?: RawCompilerOptions | TsConfigCompilerOptionsJson, resolvedConfigFile?: string): Record<string, any>;
    isTestFile(fileName: string): boolean;
    shouldStringifyContent(filePath: string): boolean;
    raiseDiagnostics(diagnostics: ts.Diagnostic[], filePath?: string, logger?: Logger): void;
    shouldReportDiagnostics(filePath: string): boolean;
    resolvePath(inputPath: string, { throwIfMissing, nodeResolve }?: {
        throwIfMissing?: boolean;
        nodeResolve?: boolean;
    }): string;
}
