import { ExtractorConfig } from './ExtractorConfig';
/**
 * Options for {@link CompilerState.create}
 * @public
 */
export interface ICompilerStateCreateOptions {
    /** {@inheritDoc IExtractorInvokeOptions.typescriptCompilerFolder} */
    typescriptCompilerFolder?: string;
    /**
     * Additional .d.ts files to include in the analysis.
     */
    additionalEntryPoints?: string[];
}
/**
 * This class represents the TypeScript compiler state.  This allows an optimization where multiple invocations
 * of API Extractor can reuse the same TypeScript compiler analysis.
 *
 * @public
 */
export declare class CompilerState {
    /**
     * The TypeScript compiler's `Program` object, which represents a complete scope of analysis.
     */
    readonly program: unknown;
    private constructor();
    /**
     * Create a compiler state for use with the specified `IExtractorInvokeOptions`.
     */
    static create(extractorConfig: ExtractorConfig, options?: ICompilerStateCreateOptions): CompilerState;
    /**
     * Given a list of absolute file paths, return a list containing only the declaration
     * files.  Duplicates are also eliminated.
     *
     * @remarks
     * The tsconfig.json settings specify the compiler's input (a set of *.ts source files,
     * plus some *.d.ts declaration files used for legacy typings).  However API Extractor
     * analyzes the compiler's output (a set of *.d.ts entry point files, plus any legacy
     * typings).  This requires API Extractor to generate a special file list when it invokes
     * the compiler.
     *
     * Duplicates are removed so that entry points can be appended without worrying whether they
     * may already appear in the tsconfig.json file list.
     */
    private static _generateFilePathsForAnalysis;
    private static _createCompilerHost;
}
//# sourceMappingURL=CompilerState.d.ts.map