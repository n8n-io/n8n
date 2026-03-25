import type { SyncTransformer, TransformedSource } from '@jest/transform';
import type { CompilerInstance, ProjectConfigTsJest, TransformOptionsTsJest, TsJestGlobalOptions } from '../types';
import { ConfigSet } from './config/config-set';
export declare class TsJestTransformer implements SyncTransformer {
    private readonly tsJestConfig?;
    private readonly _logger;
    protected _compiler: CompilerInstance;
    private _tsResolvedModulesCachePath;
    private _transformCfgStr;
    private _depGraphs;
    private _watchMode;
    constructor(tsJestConfig?: TsJestGlobalOptions | undefined);
    private _configsFor;
    protected _createConfigSet(config: ProjectConfigTsJest | undefined): ConfigSet;
    protected _createCompiler(configSet: ConfigSet, cacheFS: Map<string, string>): void;
    /**
     * @public
     */
    process(sourceText: string, sourcePath: string, transformOptions: TransformOptionsTsJest): TransformedSource;
    processAsync(sourceText: string, sourcePath: string, transformOptions: TransformOptionsTsJest): Promise<TransformedSource>;
    private processWithTs;
    private runTsJestHook;
    /**
     * Jest uses this to cache the compiled version of a file
     *
     * @see https://github.com/facebook/jest/blob/v23.5.0/packages/jest-runtime/src/script_transformer.js#L61-L90
     *
     * @public
     */
    getCacheKey(fileContent: string, filePath: string, transformOptions: TransformOptionsTsJest): string;
    getCacheKeyAsync(sourceText: string, sourcePath: string, transformOptions: TransformOptionsTsJest): Promise<string>;
    /**
     * Subclasses extends `TsJestTransformer` can call this method to get resolved module disk cache
     */
    private _getFsCachedResolvedModules;
}
