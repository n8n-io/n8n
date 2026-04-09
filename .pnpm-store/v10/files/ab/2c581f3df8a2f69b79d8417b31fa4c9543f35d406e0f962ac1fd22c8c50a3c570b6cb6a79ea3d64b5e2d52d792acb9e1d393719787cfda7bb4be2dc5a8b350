import { EnumMemberOrder } from '@microsoft/api-extractor-model';
import { TSDocConfiguration } from '@microsoft/tsdoc';
import { TSDocConfigFile } from '@microsoft/tsdoc-config';
import { type IRigConfig } from '@rushstack/rig-package';
import { JsonSchema, PackageJsonLookup, type INodePackageJson, NewlineKind } from '@rushstack/node-core-library';
import type { ApiReportVariant, IConfigFile, IExtractorMessagesConfig } from './IConfigFile';
import type { IApiModelGenerationOptions } from '../generators/ApiModelGenerator';
/**
 * Options for {@link ExtractorConfig.tryLoadForFolder}.
 *
 * @public
 */
export interface IExtractorConfigLoadForFolderOptions {
    /**
     * The folder path to start from when searching for api-extractor.json.
     */
    startingFolder: string;
    /**
     * An already constructed `PackageJsonLookup` cache object to use.  If omitted, a temporary one will
     * be constructed.
     */
    packageJsonLookup?: PackageJsonLookup;
    /**
     * An already constructed `RigConfig` object.  If omitted, then a new `RigConfig` object will be constructed.
     */
    rigConfig?: IRigConfig;
}
/**
 * Options for {@link ExtractorConfig.prepare}.
 *
 * @public
 */
export interface IExtractorConfigPrepareOptions {
    /**
     * A configuration object as returned by {@link ExtractorConfig.loadFile}.
     */
    configObject: IConfigFile;
    /**
     * The absolute path of the file that the `configObject` object was loaded from.  This is used for error messages
     * and when probing for `tsconfig.json`.
     *
     * @remarks
     *
     * If `configObjectFullPath` and `projectFolderLookupToken` are both unspecified, then the api-extractor.json
     * config file must explicitly specify a `projectFolder` setting rather than relying on the `<lookup>` token.
     */
    configObjectFullPath: string | undefined;
    /**
     * The parsed package.json file for the working package, or undefined if API Extractor was invoked without
     * a package.json file.
     *
     * @remarks
     *
     * If omitted, then the `<unscopedPackageName>` and `<packageName>` tokens will have default values.
     */
    packageJson?: INodePackageJson | undefined;
    /**
     * The absolute path of the file that the `packageJson` object was loaded from, or undefined if API Extractor
     * was invoked without a package.json file.
     *
     * @remarks
     *
     * This is used for error messages and when resolving paths found in package.json.
     *
     * If `packageJsonFullPath` is specified but `packageJson` is omitted, the file will be loaded automatically.
     */
    packageJsonFullPath: string | undefined;
    /**
     * The default value for the `projectFolder` setting is the `<lookup>` token, which uses a heuristic to guess
     * an appropriate project folder.  Use `projectFolderLookupValue` to manually specify the `<lookup>` token value
     * instead.
     *
     * @remarks
     * If the `projectFolder` setting is explicitly specified in api-extractor.json file, it should take precedence
     * over a value specified via the API.  Thus the `projectFolderLookupToken` option provides a way to override
     * the default value for `projectFolder` setting while still honoring a manually specified value.
     */
    projectFolderLookupToken?: string;
    /**
     * Allow customization of the tsdoc.json config file.  If omitted, this file will be loaded from its default
     * location.  If the file does not exist, then the standard definitions will be used from
     * `@microsoft/api-extractor/extends/tsdoc-base.json`.
     */
    tsdocConfigFile?: TSDocConfigFile;
    /**
     * When preparing the configuration object, folder and file paths referenced in the configuration are checked
     * for existence, and an error is reported if they are not found.  This option can be used to disable this
     * check for the main entry point module. This may be useful when preparing a configuration file for an
     * un-built project.
     */
    ignoreMissingEntryPoint?: boolean;
}
/**
 * Configuration for a single API report, including its {@link IExtractorConfigApiReport.variant}.
 *
 * @public
 */
export interface IExtractorConfigApiReport {
    /**
     * Report variant.
     * Determines which API items will be included in the report output, based on their tagged release levels.
     */
    variant: ApiReportVariant;
    /**
     * Name of the output report file.
     * @remarks Relative to the configured report directory path.
     */
    fileName: string;
}
/**
 * The `ExtractorConfig` class loads, validates, interprets, and represents the api-extractor.json config file.
 * @sealed
 * @public
 */
export declare class ExtractorConfig {
    /**
     * The JSON Schema for API Extractor config file (api-extractor.schema.json).
     */
    static readonly jsonSchema: JsonSchema;
    /**
     * The config file name "api-extractor.json".
     */
    static readonly FILENAME: 'api-extractor.json';
    /**
     * The full path to `extends/tsdoc-base.json` which contains the standard TSDoc configuration
     * for API Extractor.
     * @internal
     */
    static readonly _tsdocBaseFilePath: string;
    private static readonly _defaultConfig;
    /** Match all three flavors for type declaration files (.d.ts, .d.mts, .d.cts) */
    private static readonly _declarationFileExtensionRegExp;
    /** {@inheritDoc IConfigFile.projectFolder} */
    readonly projectFolder: string;
    /**
     * The parsed package.json file for the working package, or undefined if API Extractor was invoked without
     * a package.json file.
     */
    readonly packageJson: INodePackageJson | undefined;
    /**
     * The absolute path of the folder containing the package.json file for the working package, or undefined
     * if API Extractor was invoked without a package.json file.
     */
    readonly packageFolder: string | undefined;
    /** {@inheritDoc IConfigFile.mainEntryPointFilePath} */
    readonly mainEntryPointFilePath: string;
    /** {@inheritDoc IConfigFile.bundledPackages} */
    readonly bundledPackages: string[];
    /** {@inheritDoc IConfigCompiler.tsconfigFilePath} */
    readonly tsconfigFilePath: string;
    /** {@inheritDoc IConfigCompiler.overrideTsconfig} */
    readonly overrideTsconfig: {} | undefined;
    /** {@inheritDoc IConfigCompiler.skipLibCheck} */
    readonly skipLibCheck: boolean;
    /** {@inheritDoc IConfigApiReport.enabled} */
    readonly apiReportEnabled: boolean;
    /**
     * List of configurations for report files to be generated.
     * @remarks Derived from {@link IConfigApiReport.reportFileName} and {@link IConfigApiReport.reportVariants}.
     */
    readonly reportConfigs: readonly IExtractorConfigApiReport[];
    /** {@inheritDoc IConfigApiReport.reportFolder} */
    readonly reportFolder: string;
    /** {@inheritDoc IConfigApiReport.reportTempFolder} */
    readonly reportTempFolder: string;
    /** {@inheritDoc IConfigApiReport.tagsToReport} */
    readonly tagsToReport: Readonly<Record<`@${string}`, boolean>>;
    /**
     * Gets the file path for the "complete" (default) report configuration, if one was specified.
     * Otherwise, returns an empty string.
     * @deprecated Use {@link ExtractorConfig.reportConfigs} to access all report configurations.
     */
    get reportFilePath(): string;
    /**
     * Gets the temp file path for the "complete" (default) report configuration, if one was specified.
     * Otherwise, returns an empty string.
     * @deprecated Use {@link ExtractorConfig.reportConfigs} to access all report configurations.
     */
    get reportTempFilePath(): string;
    /** {@inheritDoc IConfigApiReport.includeForgottenExports} */
    readonly apiReportIncludeForgottenExports: boolean;
    /**
     * If specified, the doc model is enabled and the specified options will be used.
     * @beta
     */
    readonly docModelGenerationOptions: IApiModelGenerationOptions | undefined;
    /** {@inheritDoc IConfigDocModel.apiJsonFilePath} */
    readonly apiJsonFilePath: string;
    /** {@inheritDoc IConfigDocModel.includeForgottenExports} */
    readonly docModelIncludeForgottenExports: boolean;
    /** {@inheritDoc IConfigDocModel.projectFolderUrl} */
    readonly projectFolderUrl: string | undefined;
    /** {@inheritDoc IConfigDtsRollup.enabled} */
    readonly rollupEnabled: boolean;
    /** {@inheritDoc IConfigDtsRollup.untrimmedFilePath} */
    readonly untrimmedFilePath: string;
    /** {@inheritDoc IConfigDtsRollup.alphaTrimmedFilePath} */
    readonly alphaTrimmedFilePath: string;
    /** {@inheritDoc IConfigDtsRollup.betaTrimmedFilePath} */
    readonly betaTrimmedFilePath: string;
    /** {@inheritDoc IConfigDtsRollup.publicTrimmedFilePath} */
    readonly publicTrimmedFilePath: string;
    /** {@inheritDoc IConfigDtsRollup.omitTrimmingComments} */
    readonly omitTrimmingComments: boolean;
    /** {@inheritDoc IConfigTsdocMetadata.enabled} */
    readonly tsdocMetadataEnabled: boolean;
    /** {@inheritDoc IConfigTsdocMetadata.tsdocMetadataFilePath} */
    readonly tsdocMetadataFilePath: string;
    /**
     * The tsdoc.json configuration that will be used when parsing doc comments.
     */
    readonly tsdocConfigFile: TSDocConfigFile;
    /**
     * The `TSDocConfiguration` loaded from {@link ExtractorConfig.tsdocConfigFile}.
     */
    readonly tsdocConfiguration: TSDocConfiguration;
    /**
     * Specifies what type of newlines API Extractor should use when writing output files.  By default, the output files
     * will be written with Windows-style newlines.
     */
    readonly newlineKind: NewlineKind;
    /** {@inheritDoc IConfigFile.messages} */
    readonly messages: IExtractorMessagesConfig;
    /** {@inheritDoc IConfigFile.testMode} */
    readonly testMode: boolean;
    /** {@inheritDoc IConfigFile.enumMemberOrder} */
    readonly enumMemberOrder: EnumMemberOrder;
    private constructor();
    /**
     * Returns a JSON-like string representing the `ExtractorConfig` state, which can be printed to a console
     * for diagnostic purposes.
     *
     * @remarks
     * This is used by the "--diagnostics" command-line option.  The string is not intended to be deserialized;
     * its format may be changed at any time.
     */
    getDiagnosticDump(): string;
    /**
     * Returns a simplified file path for use in error messages.
     * @internal
     */
    _getShortFilePath(absolutePath: string): string;
    /**
     * Searches for the api-extractor.json config file associated with the specified starting folder,
     * and loads the file if found.  This lookup supports
     * {@link https://www.npmjs.com/package/@rushstack/rig-package | rig packages}.
     *
     * @remarks
     * The search will first look for a package.json file in a parent folder of the starting folder;
     * if found, that will be used as the base folder instead of the starting folder.  If the config
     * file is not found in `<baseFolder>/api-extractor.json` or `<baseFolder>/config/api-extractor.json`,
     * then `<baseFolder/config/rig.json` will be checked to see whether a
     * {@link https://www.npmjs.com/package/@rushstack/rig-package | rig package} is referenced; if so then
     * the rig's api-extractor.json file will be used instead.  If a config file is found, it will be loaded
     * and returned with the `IExtractorConfigPrepareOptions` object. Otherwise, `undefined` is returned
     * to indicate that API Extractor does not appear to be configured for the specified folder.
     *
     * @returns An options object that can be passed to {@link ExtractorConfig.prepare}, or `undefined`
     * if not api-extractor.json file was found.
     */
    static tryLoadForFolder(options: IExtractorConfigLoadForFolderOptions): IExtractorConfigPrepareOptions | undefined;
    /**
     * Loads the api-extractor.json config file from the specified file path, and prepares an `ExtractorConfig` object.
     *
     * @remarks
     * Loads the api-extractor.json config file from the specified file path.   If the "extends" field is present,
     * the referenced file(s) will be merged.  For any omitted fields, the API Extractor default values are merged.
     *
     * The result is prepared using `ExtractorConfig.prepare()`.
     */
    static loadFileAndPrepare(configJsonFilePath: string): ExtractorConfig;
    /**
     * Performs only the first half of {@link ExtractorConfig.loadFileAndPrepare}, providing an opportunity to
     * modify the object before it is passed to {@link ExtractorConfig.prepare}.
     *
     * @remarks
     * Loads the api-extractor.json config file from the specified file path.   If the "extends" field is present,
     * the referenced file(s) will be merged.  For any omitted fields, the API Extractor default values are merged.
     */
    static loadFile(jsonFilePath: string): IConfigFile;
    private static _resolveConfigFileRelativePaths;
    private static _resolveConfigFileRelativePath;
    /**
     * Prepares an `ExtractorConfig` object using a configuration that is provided as a runtime object,
     * rather than reading it from disk.  This allows configurations to be constructed programmatically,
     * loaded from an alternate source, and/or customized after loading.
     */
    static prepare(options: IExtractorConfigPrepareOptions): ExtractorConfig;
    /**
     * Gets the report configuration for the "complete" (default) report configuration, if one was specified.
     */
    private _getCompleteReportConfig;
    private static _resolvePathWithTokens;
    private static _expandStringWithTokens;
    /**
     * Returns true if the specified file path has the ".d.ts" file extension.
     */
    static hasDtsFileExtension(filePath: string): boolean;
    /**
     * Given a path string that may have originally contained expandable tokens such as `<projectFolder>"`
     * this reports an error if any token-looking substrings remain after expansion (e.g. `c:\blah\<invalid>\blah`).
     */
    private static _rejectAnyTokensInPath;
}
//# sourceMappingURL=ExtractorConfig.d.ts.map