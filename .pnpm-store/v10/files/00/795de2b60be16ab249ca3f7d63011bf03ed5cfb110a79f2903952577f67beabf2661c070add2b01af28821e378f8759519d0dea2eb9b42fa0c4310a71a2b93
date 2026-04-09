import { Logger } from 'bs-logger';
import { CompilerOptions, CustomTransformers, Program, TranspileOutput } from 'typescript';
import type { StringMap, TsCompilerInstance, TsJestAstTransformer, TsJestCompileOptions, TTypeScript, CompiledOutput } from '../../types';
import type { ConfigSet } from '../config/config-set';
export declare class TsCompiler implements TsCompilerInstance {
    readonly configSet: ConfigSet;
    readonly runtimeCacheFS: StringMap;
    protected readonly _logger: Logger;
    protected readonly _ts: TTypeScript;
    protected readonly _initialCompilerOptions: CompilerOptions;
    protected _compilerOptions: CompilerOptions;
    /**
     * @private
     */
    private _runtimeCacheFS;
    /**
     * @private
     */
    private _fileContentCache;
    program: Program | undefined;
    constructor(configSet: ConfigSet, runtimeCacheFS: StringMap);
    getResolvedModules(fileContent: string, fileName: string, runtimeCacheFS: StringMap): string[];
    private fixupCompilerOptionsForModuleKind;
    getCompiledOutput(fileContent: string, fileName: string, options: TsJestCompileOptions): CompiledOutput;
    protected _transpileOutput(fileContent: string, fileName: string): TranspileOutput;
    protected _makeTransformers(customTransformers: TsJestAstTransformer): CustomTransformers;
}
