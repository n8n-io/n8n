import type { SyncTransformer, TransformedSource } from '@jest/transform';
import type { CompilerInstance, TsJestTransformerOptions, TsJestTransformOptions } from '../types';
import { ConfigSet } from './config/config-set';
export declare class TsJestTransformer implements SyncTransformer<TsJestTransformerOptions> {
    private readonly transformerOptions?;
    private readonly _logger;
    protected _compiler: CompilerInstance;
    private _transformCfgStr;
    private _depGraphs;
    private _watchMode;
    constructor(transformerOptions?: TsJestTransformerOptions | undefined);
    private _configsFor;
    protected _createConfigSet(config: TsJestTransformOptions['config'] | undefined): ConfigSet;
    protected _createCompiler(configSet: ConfigSet, cacheFS: Map<string, string>): void;
    process(sourceText: string, sourcePath: string, transformOptions: TsJestTransformOptions): TransformedSource;
    processAsync(sourceText: string, sourcePath: string, transformOptions: TsJestTransformOptions): Promise<TransformedSource>;
    private processWithTs;
    private runTsJestHook;
    /**
     * Jest uses this to cache the compiled version of a file
     *
     * @see https://github.com/facebook/jest/blob/v23.5.0/packages/jest-runtime/src/script_transformer.js#L61-L90
     *
     * @public
     */
    getCacheKey(fileContent: string, filePath: string, transformOptions: TsJestTransformOptions): string;
    getCacheKeyAsync(sourceText: string, sourcePath: string, transformOptions: TsJestTransformOptions): Promise<string>;
}
