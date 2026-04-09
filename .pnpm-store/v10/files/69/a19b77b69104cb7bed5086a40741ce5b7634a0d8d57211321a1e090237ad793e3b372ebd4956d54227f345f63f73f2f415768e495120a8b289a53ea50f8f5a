import type { EnumMemberOrder } from '@microsoft/api-extractor-model';
import type { ExtractorLogLevel } from './ExtractorLogLevel';
/**
 * Determines how the TypeScript compiler engine will be invoked by API Extractor.
 *
 * @remarks
 * This is part of the {@link IConfigFile} structure.
 *
 * @public
 */
export interface IConfigCompiler {
    /**
     * Specifies the path to the tsconfig.json file to be used by API Extractor when analyzing the project.
     *
     * @remarks
     * The path is resolved relative to the folder of the config file that contains the setting; to change this,
     * prepend a folder token such as `<projectFolder>`.
     *
     * Note: This setting will be ignored if `overrideTsconfig` is used.
     */
    tsconfigFilePath?: string;
    /**
     * Provides a compiler configuration that will be used instead of reading the tsconfig.json file from disk.
     *
     * @remarks
     * The value must conform to the TypeScript tsconfig schema:
     *
     * http://json.schemastore.org/tsconfig
     *
     * If omitted, then the tsconfig.json file will instead be read from the projectFolder.
     */
    overrideTsconfig?: {};
    /**
     * This option causes the compiler to be invoked with the `--skipLibCheck` option.
     *
     * @remarks
     * This option is not recommended and may cause API Extractor to produce incomplete or incorrect declarations,
     * but it may be required when dependencies contain declarations that are incompatible with the TypeScript engine
     * that API Extractor uses for its analysis.  Where possible, the underlying issue should be fixed rather than
     * relying on skipLibCheck.
     */
    skipLibCheck?: boolean;
}
/**
 * The allowed variations of API reports.
 *
 * @public
 */
export type ApiReportVariant = 'public' | 'beta' | 'alpha' | 'complete';
/**
 * Configures how the API report files (*.api.md) will be generated.
 *
 * @remarks
 * This is part of the {@link IConfigFile} structure.
 *
 * @public
 */
export interface IConfigApiReport {
    /**
     * Whether to generate an API report.
     */
    enabled: boolean;
    /**
     * The base filename for the API report files, to be combined with {@link IConfigApiReport.reportFolder} or
     * {@link IConfigApiReport.reportTempFolder} to produce the full file path.
     *
     * @remarks
     * The `reportFileName` should not include any path separators such as `\` or `/`.  The `reportFileName` should
     * not include a file extension, since API Extractor will automatically append an appropriate file extension such
     * as `.api.md`.  If the {@link IConfigApiReport.reportVariants} setting is used, then the file extension includes
     * the variant name, for example `my-report.public.api.md` or `my-report.beta.api.md`. The `complete` variant always
     * uses the simple extension `my-report.api.md`.
     *
     * Previous versions of API Extractor required `reportFileName` to include the `.api.md` extension explicitly;
     * for backwards compatibility, that is still accepted but will be discarded before applying the above rules.
     *
     * @defaultValue `<unscopedPackageName>`
     */
    reportFileName?: string;
    /**
     * The set of report variants to generate.
     *
     * @remarks
     * To support different approval requirements for different API levels, multiple "variants" of the API report can
     * be generated.  The `reportVariants` setting specifies a list of variants to be generated.  If omitted,
     * by default only the `complete` variant will be generated, which includes all `@internal`, `@alpha`, `@beta`,
     * and `@public` items.  Other possible variants are `alpha` (`@alpha` + `@beta` + `@public`),
     * `beta` (`@beta` + `@public`), and `public` (`@public only`).
     *
     * The resulting API report file names will be derived from the {@link IConfigApiReport.reportFileName}.
     *
     * @defaultValue `[ "complete" ]`
     */
    reportVariants?: ApiReportVariant[];
    /**
     * Specifies the folder where the API report file is written.  The file name portion is determined by
     * the `reportFileName` setting.
     *
     * @remarks
     * The API report file is normally tracked by Git.  Changes to it can be used to trigger a branch policy,
     * e.g. for an API review.
     *
     * The path is resolved relative to the folder of the config file that contains the setting; to change this,
     * prepend a folder token such as `<projectFolder>`.
     */
    reportFolder?: string;
    /**
     * Specifies the folder where the temporary report file is written.  The file name portion is determined by
     * the `reportFileName` setting.
     *
     * @remarks
     * After the temporary file is written to disk, it is compared with the file in the `reportFolder`.
     * If they are different, a production build will fail.
     *
     * The path is resolved relative to the folder of the config file that contains the setting; to change this,
     * prepend a folder token such as `<projectFolder>`.
     */
    reportTempFolder?: string;
    /**
     * Whether "forgotten exports" should be included in the API report file.
     *
     * @remarks
     * Forgotten exports are declarations flagged with `ae-forgotten-export` warnings. See
     * https://api-extractor.com/pages/messages/ae-forgotten-export/ to learn more.
     *
     * @defaultValue `false`
     */
    includeForgottenExports?: boolean;
    /**
     * Specifies a list of {@link https://tsdoc.org/ | TSDoc} tags that should be reported in the API report file for
     * items whose documentation contains them.
     *
     * @remarks
     * Tag names must begin with `@`.
     *
     * This list may include standard TSDoc tags as well as custom ones.
     * For more information on defining custom TSDoc tags, see
     * {@link https://api-extractor.com/pages/configs/tsdoc_json/#defining-your-own-tsdoc-tags | here}.
     *
     * Note that an item's release tag will always reported; this behavior cannot be overridden.
     *
     * @defaultValue `@sealed`, `@virtual`, `@override`, `@eventProperty`, and `@deprecated`
     *
     * @example Omitting default tags
     * To omit the `@sealed` and `@virtual` tags from API reports, you would specify `tagsToReport` as follows:
     * ```json
     * "tagsToReport": {
     *  "@sealed": false,
     *  "@virtual": false
     * }
     * ```
     *
     * @example Including additional tags
     * To include additional tags to the set included in API reports, you could specify `tagsToReport` like this:
     * ```json
     * "tagsToReport": {
     *  "@customTag": true
     * }
     * ```
     * This will result in `@customTag` being included in addition to the default tags.
     */
    tagsToReport?: Readonly<Record<`@${string}`, boolean>>;
}
/**
 * The allowed release tags that can be used to mark API items.
 * @public
 */
export type ReleaseTagForTrim = '@internal' | '@alpha' | '@beta' | '@public';
/**
 * Configures how the doc model file (*.api.json) will be generated.
 *
 * @remarks
 * This is part of the {@link IConfigFile} structure.
 *
 * @public
 */
export interface IConfigDocModel {
    /**
     * Whether to generate a doc model file.
     */
    enabled: boolean;
    /**
     * The output path for the doc model file.  The file extension should be ".api.json".
     *
     * @remarks
     * The path is resolved relative to the folder of the config file that contains the setting; to change this,
     * prepend a folder token such as `<projectFolder>`.
     */
    apiJsonFilePath?: string;
    /**
     * Whether "forgotten exports" should be included in the doc model file.
     *
     * @remarks
     * Forgotten exports are declarations flagged with `ae-forgotten-export` warnings. See
     * https://api-extractor.com/pages/messages/ae-forgotten-export/ to learn more.
     *
     * @defaultValue `false`
     */
    includeForgottenExports?: boolean;
    /**
     * The base URL where the project's source code can be viewed on a website such as GitHub or
     * Azure DevOps. This URL path corresponds to the `<projectFolder>` path on disk.
     *
     * @remarks
     * This URL is concatenated with the file paths serialized to the doc model to produce URL file paths to individual API items.
     * For example, if the `projectFolderUrl` is "https://github.com/microsoft/rushstack/tree/main/apps/api-extractor" and an API
     * item's file path is "api/ExtractorConfig.ts", the full URL file path would be
     * "https://github.com/microsoft/rushstack/tree/main/apps/api-extractor/api/ExtractorConfig.js".
     *
     * Can be omitted if you don't need source code links in your API documentation reference.
     */
    projectFolderUrl?: string;
    /**
     * Specifies a list of release tags that will be trimmed from the doc model.
     *
     * @defaultValue `["@internal"]`
     */
    releaseTagsToTrim?: ReleaseTagForTrim[];
}
/**
 * Configures how the .d.ts rollup file will be generated.
 *
 * @remarks
 * This is part of the {@link IConfigFile} structure.
 *
 * @public
 */
export interface IConfigDtsRollup {
    /**
     * Whether to generate the .d.ts rollup file.
     */
    enabled: boolean;
    /**
     * Specifies the output path for a .d.ts rollup file to be generated without any trimming.
     *
     * @remarks
     * This file will include all declarations that are exported by the main entry point.
     *
     * If the path is an empty string, then this file will not be written.
     *
     * The path is resolved relative to the folder of the config file that contains the setting; to change this,
     * prepend a folder token such as `<projectFolder>`.
     */
    untrimmedFilePath?: string;
    /**
     * Specifies the output path for a .d.ts rollup file to be generated with trimming for an "alpha" release.
     *
     * @remarks
     * This file will include only declarations that are marked as `@public`, `@beta`, or `@alpha`.
     *
     * The path is resolved relative to the folder of the config file that contains the setting; to change this,
     * prepend a folder token such as `<projectFolder>`.
     */
    alphaTrimmedFilePath?: string;
    /**
     * Specifies the output path for a .d.ts rollup file to be generated with trimming for a "beta" release.
     *
     * @remarks
     * This file will include only declarations that are marked as `@public` or `@beta`.
     *
     * The path is resolved relative to the folder of the config file that contains the setting; to change this,
     * prepend a folder token such as `<projectFolder>`.
     */
    betaTrimmedFilePath?: string;
    /**
     * Specifies the output path for a .d.ts rollup file to be generated with trimming for a "public" release.
     *
     * @remarks
     * This file will include only declarations that are marked as `@public`.
     *
     * If the path is an empty string, then this file will not be written.
     *
     * The path is resolved relative to the folder of the config file that contains the setting; to change this,
     * prepend a folder token such as `<projectFolder>`.
     */
    publicTrimmedFilePath?: string;
    /**
     * When a declaration is trimmed, by default it will be replaced by a code comment such as
     * "Excluded from this release type: exampleMember".  Set "omitTrimmingComments" to true to remove the
     * declaration completely.
     */
    omitTrimmingComments?: boolean;
}
/**
 * Configures how the tsdoc-metadata.json file will be generated.
 *
 * @remarks
 * This is part of the {@link IConfigFile} structure.
 *
 * @public
 */
export interface IConfigTsdocMetadata {
    /**
     * Whether to generate the tsdoc-metadata.json file.
     */
    enabled: boolean;
    /**
     * Specifies where the TSDoc metadata file should be written.
     *
     * @remarks
     * The path is resolved relative to the folder of the config file that contains the setting; to change this,
     * prepend a folder token such as `<projectFolder>`.
     *
     * The default value is `<lookup>`, which causes the path to be automatically inferred from the `tsdocMetadata`,
     * `typings` or `main` fields of the project's package.json.  If none of these fields are set, the lookup
     * falls back to `tsdoc-metadata.json` in the package folder.
     */
    tsdocMetadataFilePath?: string;
}
/**
 * Configures reporting for a given message identifier.
 *
 * @remarks
 * This is part of the {@link IConfigFile} structure.
 *
 * @public
 */
export interface IConfigMessageReportingRule {
    /**
     * Specifies whether the message should be written to the the tool's output log.
     *
     * @remarks
     * Note that the `addToApiReportFile` property may supersede this option.
     */
    logLevel: ExtractorLogLevel;
    /**
     * When `addToApiReportFile` is true:  If API Extractor is configured to write an API report file (.api.md),
     * then the message will be written inside that file; otherwise, the message is instead logged according to
     * the `logLevel` option.
     */
    addToApiReportFile?: boolean;
}
/**
 * Specifies a table of reporting rules for different message identifiers, and also the default rule used for
 * identifiers that do not appear in the table.
 *
 * @remarks
 * This is part of the {@link IConfigFile} structure.
 *
 * @public
 */
export interface IConfigMessageReportingTable {
    /**
     * The key is a message identifier for the associated type of message, or "default" to specify the default policy.
     * For example, the key might be `TS2551` (a compiler message), `tsdoc-link-tag-unescaped-text` (a TSDOc message),
     * or `ae-extra-release-tag` (a message related to the API Extractor analysis).
     */
    [messageId: string]: IConfigMessageReportingRule;
}
/**
 * Configures how API Extractor reports error and warning messages produced during analysis.
 *
 * @remarks
 * This is part of the {@link IConfigFile} structure.
 *
 * @public
 */
export interface IExtractorMessagesConfig {
    /**
     * Configures handling of diagnostic messages generating the TypeScript compiler while analyzing the
     * input .d.ts files.
     */
    compilerMessageReporting?: IConfigMessageReportingTable;
    /**
     * Configures handling of messages reported by API Extractor during its analysis.
     */
    extractorMessageReporting?: IConfigMessageReportingTable;
    /**
     * Configures handling of messages reported by the TSDoc parser when analyzing code comments.
     */
    tsdocMessageReporting?: IConfigMessageReportingTable;
}
/**
 * Configuration options for the API Extractor tool.  These options can be constructed programmatically
 * or loaded from the api-extractor.json config file using the {@link ExtractorConfig} class.
 *
 * @public
 */
export interface IConfigFile {
    /**
     * Optionally specifies another JSON config file that this file extends from.  This provides a way for
     * standard settings to be shared across multiple projects.
     *
     * @remarks
     * If the path starts with `./` or `../`, the path is resolved relative to the folder of the file that contains
     * the `extends` field.  Otherwise, the first path segment is interpreted as an NPM package name, and will be
     * resolved using NodeJS `require()`.
     */
    extends?: string;
    /**
     * Determines the `<projectFolder>` token that can be used with other config file settings.  The project folder
     * typically contains the tsconfig.json and package.json config files, but the path is user-defined.
     *
     * @remarks
     *
     * The path is resolved relative to the folder of the config file that contains the setting.
     *
     * The default value for `projectFolder` is the token `<lookup>`, which means the folder is determined using
     * the following heuristics:
     *
     * If the config/rig.json system is used (as defined by {@link https://www.npmjs.com/package/@rushstack/rig-package
     * | @rushstack/rig-package}), then the `<lookup>` value will be the package folder that referenced the rig.
     *
     * Otherwise, the `<lookup>` value is determined by traversing parent folders, starting from the folder containing
     * api-extractor.json, and stopping at the first folder that contains a tsconfig.json file.  If a tsconfig.json file
     * cannot be found in this way, then an error will be reported.
     */
    projectFolder?: string;
    /**
     * Specifies the .d.ts file to be used as the starting point for analysis.  API Extractor
     * analyzes the symbols exported by this module.
     *
     * @remarks
     *
     * The file extension must be ".d.ts" and not ".ts".
     * The path is resolved relative to the "projectFolder" location.
     */
    mainEntryPointFilePath: string;
    /**
     * A list of NPM package names whose exports should be treated as part of this package.
     *
     * @remarks
     * Also supports glob patterns.
     * Note: glob patterns will **only** be resolved against dependencies listed in the project's package.json file.
     *
     * * This is both a safety and a performance precaution.
     *
     * Exact package names will be applied against any dependency encountered while walking the type graph, regardless of
     * dependencies listed in the package.json.
     *
     * @example
     *
     * Suppose that Webpack is used to generate a distributed bundle for the project `library1`,
     * and another NPM package `library2` is embedded in this bundle.  Some types from `library2` may become part
     * of the exported API for `library1`, but by default API Extractor would generate a .d.ts rollup that explicitly
     * imports `library2`.  To avoid this, we can specify:
     *
     * ```js
     *   "bundledPackages": [ "library2" ],
     * ```
     *
     * This would direct API Extractor to embed those types directly in the .d.ts rollup, as if they had been
     * local files for `library1`.
     */
    bundledPackages?: string[];
    /**
     * Specifies what type of newlines API Extractor should use when writing output files.
     *
     * @remarks
     * By default, the output files will be written with Windows-style newlines.
     * To use POSIX-style newlines, specify "lf" instead.
     * To use the OS's default newline kind, specify "os".
     */
    newlineKind?: 'crlf' | 'lf' | 'os';
    /**
     * Set to true when invoking API Extractor's test harness.
     * @remarks
     * When `testMode` is true, the `toolVersion` field in the .api.json file is assigned an empty string
     * to prevent spurious diffs in output files tracked for tests.
     */
    testMode?: boolean;
    /**
     * Specifies how API Extractor sorts members of an enum when generating the .api.json file.
     *
     * @remarks
     * By default, the output files will be sorted alphabetically, which is "by-name".
     * To keep the ordering in the source code, specify "preserve".
     *
     * @defaultValue `by-name`
     */
    enumMemberOrder?: EnumMemberOrder;
    /**
     * {@inheritDoc IConfigCompiler}
     */
    compiler?: IConfigCompiler;
    /**
     * {@inheritDoc IConfigApiReport}
     */
    apiReport?: IConfigApiReport;
    /**
     * {@inheritDoc IConfigDocModel}
     */
    docModel?: IConfigDocModel;
    /**
     * {@inheritDoc IConfigDtsRollup}
     * @beta
     */
    dtsRollup?: IConfigDtsRollup;
    /**
     * {@inheritDoc IConfigTsdocMetadata}
     * @beta
     */
    tsdocMetadata?: IConfigTsdocMetadata;
    /**
     * {@inheritDoc IExtractorMessagesConfig}
     */
    messages?: IExtractorMessagesConfig;
}
//# sourceMappingURL=IConfigFile.d.ts.map