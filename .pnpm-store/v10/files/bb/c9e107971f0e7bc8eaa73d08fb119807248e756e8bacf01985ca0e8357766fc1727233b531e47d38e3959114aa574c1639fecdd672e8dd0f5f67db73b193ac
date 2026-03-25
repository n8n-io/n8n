import { ExtractorConfig } from './ExtractorConfig';
import { CompilerState } from './CompilerState';
import type { ExtractorMessage } from './ExtractorMessage';
/**
 * Runtime options for Extractor.
 *
 * @public
 */
export interface IExtractorInvokeOptions {
    /**
     * An optional TypeScript compiler state.  This allows an optimization where multiple invocations of API Extractor
     * can reuse the same TypeScript compiler analysis.
     */
    compilerState?: CompilerState;
    /**
     * Indicates that API Extractor is running as part of a local build, e.g. on developer's
     * machine.
     *
     * @remarks
     * This disables certain validation that would normally be performed for a ship/production build. For example,
     * the *.api.md report file is automatically updated in a local build.
     *
     * The default value is false.
     */
    localBuild?: boolean;
    /**
     * If true, API Extractor will include {@link ExtractorLogLevel.Verbose} messages in its output.
     */
    showVerboseMessages?: boolean;
    /**
     * If true, API Extractor will print diagnostic information used for troubleshooting problems.
     * These messages will be included as {@link ExtractorLogLevel.Verbose} output.
     *
     * @remarks
     * Setting `showDiagnostics=true` forces `showVerboseMessages=true`.
     */
    showDiagnostics?: boolean;
    /**
     * Specifies an alternate folder path to be used when loading the TypeScript system typings.
     *
     * @remarks
     * API Extractor uses its own TypeScript compiler engine to analyze your project.  If your project
     * is built with a significantly different TypeScript version, sometimes API Extractor may report compilation
     * errors due to differences in the system typings (e.g. lib.dom.d.ts).  You can use the "--typescriptCompilerFolder"
     * option to specify the folder path where you installed the TypeScript package, and API Extractor's compiler will
     * use those system typings instead.
     */
    typescriptCompilerFolder?: string;
    /**
     * An optional callback function that will be called for each `ExtractorMessage` before it is displayed by
     * API Extractor.  The callback can customize the message, handle it, or discard it.
     *
     * @remarks
     * If a `messageCallback` is not provided, then by default API Extractor will print the messages to
     * the STDERR/STDOUT console.
     */
    messageCallback?: (message: ExtractorMessage) => void;
}
/**
 * This object represents the outcome of an invocation of API Extractor.
 *
 * @public
 */
export declare class ExtractorResult {
    /**
     * The TypeScript compiler state that was used.
     */
    readonly compilerState: CompilerState;
    /**
     * The API Extractor configuration that was used.
     */
    readonly extractorConfig: ExtractorConfig;
    /**
     * Whether the invocation of API Extractor was successful.  For example, if `succeeded` is false, then the build task
     * would normally return a nonzero process exit code, indicating that the operation failed.
     *
     * @remarks
     *
     * Normally the operation "succeeds" if `errorCount` and `warningCount` are both zero.  However if
     * {@link IExtractorInvokeOptions.localBuild} is `true`, then the operation "succeeds" if `errorCount` is zero
     * (i.e. warnings are ignored).
     */
    readonly succeeded: boolean;
    /**
     * Returns true if the API report was found to have changed.
     */
    readonly apiReportChanged: boolean;
    /**
     * Reports the number of errors encountered during analysis.
     *
     * @remarks
     * This does not count exceptions, where unexpected issues prematurely abort the operation.
     */
    readonly errorCount: number;
    /**
     * Reports the number of warnings encountered during analysis.
     *
     * @remarks
     * This does not count warnings that are emitted in the API report file.
     */
    readonly warningCount: number;
    /** @internal */
    constructor(properties: ExtractorResult);
}
/**
 * The starting point for invoking the API Extractor tool.
 * @public
 */
export declare class Extractor {
    /**
     * Returns the version number of the API Extractor NPM package.
     */
    static get version(): string;
    /**
     * Returns the package name of the API Extractor NPM package.
     */
    static get packageName(): string;
    private static _getPackageJson;
    /**
     * Load the api-extractor.json config file from the specified path, and then invoke API Extractor.
     */
    static loadConfigAndInvoke(configFilePath: string, options?: IExtractorInvokeOptions): ExtractorResult;
    /**
     * Invoke API Extractor using an already prepared `ExtractorConfig` object.
     */
    static invoke(extractorConfig: ExtractorConfig, options?: IExtractorInvokeOptions): ExtractorResult;
    /**
     * Generates the API report at the specified release level, writes it to the specified file path, and compares
     * the output to the existing report (if one exists).
     *
     * @param reportTempDirectoryPath - The path to the directory under which the temp report file will be written prior
     * to comparison with an existing report.
     * @param reportDirectoryPath - The path to the directory under which the existing report file is located, and to
     * which the new report will be written post-comparison.
     * @param reportConfig - API report configuration, including its file name and {@link ApiReportVariant}.
     *
     * @returns Whether or not the newly generated report differs from the existing report (if one exists).
     */
    private static _writeApiReport;
    private static _checkCompilerCompatibility;
    private static _generateRollupDtsFile;
}
//# sourceMappingURL=Extractor.d.ts.map